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
    private var wakeLock: PowerManager.WakeLock? = null

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

        val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "RoditteFleet:LocationKeepAliveWakeLock"
            ).apply {
                setReferenceCounted(false)
            }
        }

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
                activeDriverId = intent.getStringExtra(EXTRA_DRIVER_ID) ?: "d1"
                activeJobId = intent.getStringExtra(EXTRA_JOB_ID)
                trackingIntervalMs = intent.getLongExtra(EXTRA_INTERVAL_MS, 15000L)
                acquireKeepAliveWakeLock()
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

    private fun acquireKeepAliveWakeLock() {
        try {
            if (wakeLock?.isHeld != true) {
                wakeLock?.acquire(24 * 60 * 60 * 1000L) // 24-hour safety timeout
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun releaseKeepAliveWakeLock() {
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun startForegroundServiceWithNotification() {
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Roditte Fleet Driver Active")
            .setContentText("Keep-alive GPS streaming live to Dispatch Desk")
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

    private fun updateForegroundNotification(lat: Double, lng: Double, speedKmh: Int) {
        try {
            val notification = NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Roditte Fleet Driver Active")
                .setContentText("📍 Lat: ${"%.4f".format(lat)}, Lng: ${"%.4f".format(lng)} • Speed: $speedKmh km/h")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build()
            val manager = getSystemService(NotificationManager::class.java)
            manager?.notify(NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun requestLocationUpdates() {
        val locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY,
            trackingIntervalMs
        ).apply {
            setMinUpdateIntervalMillis(trackingIntervalMs / 2)
            setMinUpdateDistanceMeters(3f) // sensitive to small movements
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

        val speedKmh = if (location.hasSpeed()) (location.speed * 3.6f).toInt() else 0

        // 1. Immediately cache live coordinates in SharedPreferences for instantaneous Admin / App visibility
        try {
            val prefs = getSharedPreferences("fleet_driver_prefs", Context.MODE_PRIVATE)
            prefs.edit()
                .putString("live_driver_lat", location.latitude.toString())
                .putString("live_driver_lng", location.longitude.toString())
                .putInt("live_driver_speed", speedKmh)
                .putLong("live_driver_last_ping", System.currentTimeMillis())
                .putBoolean("live_driver_keep_alive", true)
                .apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }

        val point = GpsPointEntity(
            driverId = if (activeDriverId.isNotBlank()) activeDriverId else "d1",
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

        // 2. Persist to local database
        serviceScope.launch {
            try {
                db.gpsDao().insertPoint(point)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        // 3. Dispatch live fix to cloud backend telemetry endpoint
        serviceScope.launch {
            try {
                val payload = com.fleet.delivery.data.remote.GpsPointPayload(
                    latitude = location.latitude,
                    longitude = location.longitude,
                    accuracy = location.accuracy,
                    speed = if (location.hasSpeed()) location.speed else null,
                    bearing = if (location.hasBearing()) location.bearing else null,
                    altitude = if (location.hasAltitude()) location.altitude else null,
                    is_mock = isMock,
                    timestamp_device = timestampDevice
                )
                val batchReq = com.fleet.delivery.data.remote.BatchGpsRequest(
                    driver_id = if (activeDriverId.isNotBlank()) activeDriverId else "d1",
                    job_id = activeJobId,
                    points = listOf(payload)
                )
                val response = com.fleet.delivery.data.remote.ApiClient.service.uploadGpsBatch(batchReq)
                if (response.isSuccessful) {
                    updateForegroundNotification(location.latitude, location.longitude, speedKmh)
                }
            } catch (e: Exception) {
                // Device is offline or in deadzone; Room database buffers point for OfflineSyncWorker
            }
        }
    }

    private fun getBatteryLevel(): Int {
        val bm = getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
        return bm?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: 100
    }

    private fun stopForegroundTracking() {
        releaseKeepAliveWakeLock()
        val prefs = getSharedPreferences("fleet_driver_prefs", Context.MODE_PRIVATE)
        prefs.edit().putBoolean("live_driver_keep_alive", false).apply()
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
        releaseKeepAliveWakeLock()
        val prefs = getSharedPreferences("fleet_driver_prefs", Context.MODE_PRIVATE)
        prefs.edit().putBoolean("live_driver_keep_alive", false).apply()
        fusedLocationClient.removeLocationUpdates(locationCallback)
        serviceScope.cancel()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
