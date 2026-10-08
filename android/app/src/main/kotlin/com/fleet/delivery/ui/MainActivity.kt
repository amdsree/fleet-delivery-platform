package com.fleet.delivery.ui

import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.fleet.delivery.service.LocationTrackingService
import com.fleet.delivery.ui.screens.*

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val prefs = getSharedPreferences("fleet_driver_prefs", Context.MODE_PRIVATE)

        setContent {
            var isLoggedIn by remember { 
                mutableStateOf(prefs.getBoolean("is_logged_in", true)) 
            }
            var userName by remember { 
                mutableStateOf(prefs.getString("user_name", "Super Administrator") ?: "Super Administrator") 
            }
            var userEmail by remember { 
                mutableStateOf(prefs.getString("user_email", "admin@fleetplatform.com") ?: "admin@fleetplatform.com") 
            }
            var userRole by remember { 
                mutableStateOf(prefs.getString("user_role", "ADMIN") ?: "ADMIN") 
            }
            var driverVehicle by remember { 
                mutableStateOf(prefs.getString("driver_vehicle", "KA-04-AB-1234 (Tata Ace)") ?: "KA-04-AB-1234 (Tata Ace)") 
            }
            var currentScreen by remember { mutableStateOf("HOME") }

            if (!isLoggedIn) {
                LoginScreen(
                    onLoginSuccess = { name, email, role, token ->
                        val vehicleName = when (name) {
                            "Lead Driver 1", "Driver 1" -> "KA-04-AB-1234 (Tata Ace)"
                            "Driver 2" -> "KA-05-CD-5678 (Eicher Pro)"
                            "Driver 3" -> "KA-51-EF-9012 (Mahindra Bolero)"
                            else -> "KA-04-AB-1234 (Tata Ace)"
                        }
                        prefs.edit()
                            .putBoolean("is_logged_in", true)
                            .putString("user_name", name)
                            .putString("user_email", email)
                            .putString("user_role", role)
                            .putString("driver_vehicle", vehicleName)
                            .putString("auth_token", token)
                            .apply()
                        userName = name
                        userEmail = email
                        userRole = role
                        driverVehicle = vehicleName
                        isLoggedIn = true
                        currentScreen = "HOME"
                    }
                )
            } else if (userRole == "ADMIN" || userRole == "GODOWN_MANAGER" || userRole == "SALES_STAFF") {
                // STAFF & MANAGEMENT PORTAL (Admin, Godown Manager, Sales Staff)
                StaffOperationsScreen(
                    userName = userName,
                    userRole = userRole,
                    userEmail = userEmail,
                    onLogoutClick = {
                        prefs.edit().putBoolean("is_logged_in", false).apply()
                        isLoggedIn = false
                    }
                )
            } else {
                // DRIVER PORTAL
                BackHandler(enabled = currentScreen != "HOME") {
                    currentScreen = "HOME"
                }

                Scaffold(
                    bottomBar = {
                        NavigationBar(
                            containerColor = Color(0xFF1E293B),
                            contentColor = Color.White
                        ) {
                            NavigationBarItem(
                                selected = currentScreen == "HOME",
                                onClick = { currentScreen = "HOME" },
                                icon = { Icon(Icons.Default.Home, contentDescription = "Dashboard") },
                                label = { Text("Home") },
                                colors = NavigationBarItemDefaults.colors(
                                    selectedIconColor = Color(0xFF10B981),
                                    selectedTextColor = Color(0xFF10B981),
                                    unselectedIconColor = Color(0xFF94A3B8),
                                    unselectedTextColor = Color(0xFF94A3B8),
                                    indicatorColor = Color(0xFF0F172A)
                                )
                            )
                            NavigationBarItem(
                                selected = currentScreen == "OFFER",
                                onClick = { currentScreen = "OFFER" },
                                icon = { Icon(Icons.Default.Notifications, contentDescription = "Offer") },
                                label = { Text("Offer") },
                                colors = NavigationBarItemDefaults.colors(
                                    selectedIconColor = Color(0xFF38BDF8),
                                    selectedTextColor = Color(0xFF38BDF8),
                                    unselectedIconColor = Color(0xFF94A3B8),
                                    unselectedTextColor = Color(0xFF94A3B8),
                                    indicatorColor = Color(0xFF0F172A)
                                )
                            )
                            NavigationBarItem(
                                selected = currentScreen == "ACTIVE_JOB",
                                onClick = { currentScreen = "ACTIVE_JOB" },
                                icon = { Icon(Icons.Default.LocalShipping, contentDescription = "Active Trip") },
                                label = { Text("Trip") },
                                colors = NavigationBarItemDefaults.colors(
                                    selectedIconColor = Color(0xFFFBBF24),
                                    selectedTextColor = Color(0xFFFBBF24),
                                    unselectedIconColor = Color(0xFF94A3B8),
                                    unselectedTextColor = Color(0xFF94A3B8),
                                    indicatorColor = Color(0xFF0F172A)
                                )
                            )
                            NavigationBarItem(
                                selected = currentScreen == "POD",
                                onClick = { currentScreen = "POD" },
                                icon = { Icon(Icons.Default.CheckCircle, contentDescription = "POD Signature") },
                                label = { Text("POD") },
                                colors = NavigationBarItemDefaults.colors(
                                    selectedIconColor = Color(0xFFA855F7),
                                    selectedTextColor = Color(0xFFA855F7),
                                    unselectedIconColor = Color(0xFF94A3B8),
                                    unselectedTextColor = Color(0xFF94A3B8),
                                    indicatorColor = Color(0xFF0F172A)
                                )
                            )
                        }
                    }
                ) { innerPadding ->
                    Box(modifier = Modifier.padding(innerPadding)) {
                        when (currentScreen) {
                            "HOME" -> {
                                DriverHomeScreen(
                                    driverName = userName,
                                    vehicleNumber = driverVehicle,
                                    isVehicleMoving = false,
                                    onViewJobClick = { currentScreen = "ACTIVE_JOB" },
                                    onDutyToggle = { isOnDuty ->
                                        if (isOnDuty) {
                                            startLocationService()
                                        } else {
                                            stopLocationService()
                                        }
                                    },
                                    onLogoutClick = {
                                        stopLocationService()
                                        prefs.edit().putBoolean("is_logged_in", false).apply()
                                        isLoggedIn = false
                                    }
                                )
                            }
                            "OFFER" -> {
                                JobOfferScreen(
                                    onAccept = { jobId, selectedVehicle ->
                                        driverVehicle = selectedVehicle
                                        prefs.edit().putString("driver_vehicle", selectedVehicle).apply()
                                        startLocationService()
                                        com.fleet.delivery.util.FleetNotificationManager.showOperationalAlert(
                                            this@MainActivity,
                                            "JOB_ACCEPTED",
                                            "Job Started: $jobId",
                                            "Vehicle $selectedVehicle selected based on parcel size. Keep-alive GPS active."
                                        )
                                        currentScreen = "ACTIVE_JOB"
                                    },
                                    onReject = { jobId, reason, remarks ->
                                        com.fleet.delivery.util.FleetNotificationManager.showOperationalAlert(
                                            this@MainActivity,
                                            "JOB_REJECTED",
                                            "⚠️ Job Declined by Driver",
                                            "Rejected $jobId ($reason: $remarks). Godown Manager notified to assign another driver."
                                        )
                                        currentScreen = "HOME"
                                    }
                                )
                            }
                            "ACTIVE_JOB" -> {
                                ActiveJobScreen(
                                    onArriveClick = {
                                        com.fleet.delivery.util.FleetNotificationManager.showOperationalAlert(
                                            this@MainActivity,
                                            "LOCATION_REACHED",
                                            "Location Reached: Alpha Wholesale",
                                            "Arrival recorded. Verified within 50m geofence."
                                        )
                                    },
                                    onStartOperationClick = { /* start loading/unloading */ },
                                    onOpenPodClick = { currentScreen = "POD" },
                                    onCompleteStopClick = {
                                        com.fleet.delivery.util.FleetNotificationManager.showOperationalAlert(
                                            this@MainActivity,
                                            "MATERIAL_COLLECTED",
                                            "Material Collected Successfully",
                                            "Pickup completed at Alpha Wholesale. En route to Metro Hypermarket."
                                        )
                                    }
                                )
                            }
                            "POD" -> {
                                PodScreen(
                                    onSubmitPod = { _, _, _, _, _, _ ->
                                        com.fleet.delivery.util.FleetNotificationManager.showOperationalAlert(
                                            this@MainActivity,
                                            "MATERIAL_DELIVERED",
                                            "Material Delivered (POD Verified)",
                                            "Customer signature & delivery verified at Metro Hypermarket."
                                        )
                                        com.fleet.delivery.util.FleetNotificationManager.showOperationalAlert(
                                            this@MainActivity,
                                            "JOB_FINISHED",
                                            "Job Finished: #10045",
                                            "Trip successfully completed! You are now available for new dispatch offers."
                                        )
                                        currentScreen = "HOME"
                                    },
                                    onCancel = { currentScreen = "ACTIVE_JOB" }
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    private fun startLocationService() {
        val intent = Intent(this, LocationTrackingService::class.java).apply {
            action = LocationTrackingService.ACTION_START
            putExtra(LocationTrackingService.EXTRA_DRIVER_ID, "driver-1")
            putExtra(LocationTrackingService.EXTRA_INTERVAL_MS, 15000L)
        }
        startService(intent)
    }

    private fun stopLocationService() {
        val intent = Intent(this, LocationTrackingService::class.java).apply {
            action = LocationTrackingService.ACTION_STOP
        }
        startService(intent)
    }
}
