package com.fleet.delivery.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.Location
import android.os.*
import androidx.core.app.NotificationCompat
import com.fleet.delivery.data.local.AppDatabase
import com.fleet.delivery.data.local.GpsPointEntity
import com.google.android.gms.location.*
import kotlinx.coroutines.*
import java.text.SimpleDateFormat
import java.util.*

class LocationTrackingService : Service() {

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private lateinit var db: AppDatabase

    private var activeDriverId: String = ""
    private var activeJobId: String? = null
    private var activeVehicleId: String? = null
    private var trackingIntervalMs: Long = 15000L // Default: 15s in transit

    companion object {
        const val CHANNEL_ID = "fleet_location_tracking"
        const val NOTIFICATION_ID = 4040
        const val ACTION_START = "ACTION_START_TRACKING"
        const val ACTION_STOP = "ACTION_STOP_TRACKING"
        const val ACTION_UPDATE_INTERVAL = "ACTION_UPDATE_INTERVAL"

        const val EXTRA_DRIVER_ID = "EXTRA_DRIVER_ID"
        const val EXTRA_JOB_ID = "EXTRA_JOB_ID"
        const val EXTRA_INTERVAL_MS = "EXTRA_INTERVAL_MS"
    }

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        db = AppDatabase.getInstance(this)
        createNotificationChannel()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                for (location in result.locations) {
                    processLocationFix(location)
                }
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                activeDriverId = intent.getStringExtra(EXTRA_DRIVER_ID) ?: ""
                activeJobId = intent.getStringExtra(EXTRA_JOB_ID)
                trackingIntervalMs = intent.getLongExtra(EXTRA_INTERVAL_MS, 15000L)
                startForegroundServiceWithNotification()
                requestLocationUpdates()
            }
            ACTION_UPDATE_INTERVAL -> {
                val newInterval = intent.getLongExtra(EXTRA_INTERVAL_MS, 15000L)
                if (newInterval != trackingIntervalMs) {
                    trackingIntervalMs = newInterval
                    fusedLocationClient.removeLocationUpdates(locationCallback)
                    requestLocationUpdates()
                }
            }
            ACTION_STOP -> {
                stopForegroundTracking()
            }
        }
        return START_STICKY
    }

    private fun startForegroundServiceWithNotification() {
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("FleetOps Driver Active")
            .setContentText("Background GPS tracking active for delivery dispatch")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun requestLocationUpdates() {
        val locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY,
            trackingIntervalMs
        ).apply {
            setMinUpdateIntervalMillis(trackingIntervalMs / 2)
            setMinUpdateDistanceMeters(5f) // ignore stationary jitter
            setWaitForAccurateLocation(false)
        }.build()

        try {
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            )
        } catch (e: SecurityException) {
            e.printStackTrace()
        }
    }

    private fun processLocationFix(location: Location) {
        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        isoFormat.timeZone = TimeZone.getTimeZone("UTC")
        val timestampDevice = isoFormat.format(Date(location.time))

        val isMock = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            location.isMock
        } else {
            @Suppress("DEPRECATION")
            location.isFromMockProvider
        }

        val point = GpsPointEntity(
            driverId = activeDriverId,
            jobId = activeJobId,
            vehicleId = activeVehicleId,
            latitude = location.latitude,
            longitude = location.longitude,
            accuracy = location.accuracy,
            altitude = if (location.hasAltitude()) location.altitude else null,
            speed = if (location.hasSpeed()) location.speed else null,
            bearing = if (location.hasBearing()) location.bearing else null,
            batteryLevel = getBatteryLevel(),
            networkType = "CELLULAR",
            isMock = isMock,
            timestampDevice = timestampDevice,
            isSynced = false
        )

        serviceScope.launch {
            db.gpsDao().insertPoint(point)
        }
    }

    private fun getBatteryLevel(): Int {
        val bm = getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
        return bm?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: 100
    }

    private fun stopForegroundTracking() {
        fusedLocationClient.removeLocationUpdates(locationCallback)
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Fleet Location Tracking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Monitors driver dispatch position in background"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        fusedLocationClient.removeLocationUpdates(locationCallback)
        serviceScope.cancel()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
