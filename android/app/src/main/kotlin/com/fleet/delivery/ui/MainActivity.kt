package com.fleet.delivery.ui

import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.fleet.delivery.service.LocationTrackingService
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import com.fleet.delivery.util.SecurityIntegrityChecker
import com.fleet.delivery.ui.screens.*

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val prefs = getSharedPreferences("fleet_driver_prefs", Context.MODE_PRIVATE)
        val integrityResult = SecurityIntegrityChecker.checkIntegrity(this)

        setContent {
            var showTamperWarning by remember { mutableStateOf(!integrityResult.isSecure) }
            if (showTamperWarning) {
                AlertDialog(
                    onDismissRequest = { showTamperWarning = false },
                    title = { Text("⚠️ Security & Integrity Alert", fontWeight = FontWeight.Bold, color = Color(0xFFDC2626)) },
                    text = {
                        Column {
                            Text("Application integrity verification failed:", fontSize = 12.sp, color = Color(0xFF334155))
                            Spacer(modifier = Modifier.height(6.dp))
                            integrityResult.violations.forEach { v ->
                                Text("• $v", color = Color(0xFFDC2626), fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Text("Fingerprint: ${integrityResult.currentFingerprint.take(24)}...", fontSize = 10.sp, color = Color(0xFF64748B))
                        }
                    },
                    confirmButton = {
                        Button(
                            onClick = { showTamperWarning = false },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                        ) {
                            Text("Acknowledge")
                        }
                    },
                    containerColor = Color.White
                )
            }

            var isLoggedIn by remember { 
                mutableStateOf(prefs.getBoolean("is_logged_in", true)) 
            }
            val initialRole = prefs.getString("user_role", "ADMIN") ?: "ADMIN"
            val storedName = prefs.getString("user_name", if (initialRole == "ADMIN") "Edwin" else "Edwin")
            val initialName = if (initialRole == "ADMIN") "Edwin" else (storedName ?: "Edwin")
            var userName by remember { mutableStateOf(initialName) }
            var userEmail by remember { 
                mutableStateOf(prefs.getString("user_email", "admin@fleetplatform.com") ?: "admin@fleetplatform.com") 
            }
            var userRole by remember { 
                mutableStateOf(initialRole) 
            }
            var driverVehicle by remember { 
                mutableStateOf(prefs.getString("driver_vehicle", "KA-04-AB-1234 (Tata Ace)") ?: "KA-04-AB-1234 (Tata Ace)") 
            }
            var currentScreen by remember { mutableStateOf("HOME") }

            if (!isLoggedIn) {
                LoginScreen(
                    onLoginSuccess = { name, email, role, token ->
                        val effectiveName = if (role == "ADMIN") "Edwin" else name
                        val vehicleName = when (effectiveName) {
                            "Kiran Kumar" -> "KA-04-AB-1234 (Tata Ace)"
                            "Ramesh Babu" -> "KA-05-CD-5678 (Eicher Pro)"
                            "Sunil V" -> "KA-51-EF-9012 (Mahindra Bolero)"
                            "Anand Rao" -> "KA-03-GH-3456 (Piaggio Ape Electric)"
                            else -> "KA-04-AB-1234 (Tata Ace)"
                        }
                        prefs.edit()
                            .putBoolean("is_logged_in", true)
                            .putString("user_name", effectiveName)
                            .putString("user_email", email)
                            .putString("user_role", role)
                            .putString("driver_vehicle", vehicleName)
                            .putString("auth_token", token)
                            .apply()
                        userName = effectiveName
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
                        Surface(
                            shadowElevation = 8.dp,
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
                        ) {
                            NavigationBar(
                                containerColor = Color.White,
                                contentColor = Color(0xFF0F172A)
                            ) {
                                NavigationBarItem(
                                    selected = currentScreen == "HOME",
                                    onClick = { currentScreen = "HOME" },
                                    icon = { Icon(Icons.Default.Home, contentDescription = "Dashboard") },
                                    label = { Text("Home") },
                                    colors = NavigationBarItemDefaults.colors(
                                        selectedIconColor = Color(0xFF1D4ED8),
                                        selectedTextColor = Color(0xFF1D4ED8),
                                        unselectedIconColor = Color(0xFF64748B),
                                        unselectedTextColor = Color(0xFF64748B),
                                        indicatorColor = Color(0xFFEFF6FF)
                                    )
                                )
                                NavigationBarItem(
                                    selected = currentScreen == "OFFER",
                                    onClick = { currentScreen = "OFFER" },
                                    icon = { Icon(Icons.Default.Notifications, contentDescription = "Offer") },
                                    label = { Text("Offer") },
                                    colors = NavigationBarItemDefaults.colors(
                                        selectedIconColor = Color(0xFF1D4ED8),
                                        selectedTextColor = Color(0xFF1D4ED8),
                                        unselectedIconColor = Color(0xFF64748B),
                                        unselectedTextColor = Color(0xFF64748B),
                                        indicatorColor = Color(0xFFEFF6FF)
                                    )
                                )
                                NavigationBarItem(
                                    selected = currentScreen == "ACTIVE_JOB",
                                    onClick = { currentScreen = "ACTIVE_JOB" },
                                    icon = { Icon(Icons.Default.LocalShipping, contentDescription = "Active Trip") },
                                    label = { Text("Trip") },
                                    colors = NavigationBarItemDefaults.colors(
                                        selectedIconColor = Color(0xFF1D4ED8),
                                        selectedTextColor = Color(0xFF1D4ED8),
                                        unselectedIconColor = Color(0xFF64748B),
                                        unselectedTextColor = Color(0xFF64748B),
                                        indicatorColor = Color(0xFFEFF6FF)
                                    )
                                )
                                NavigationBarItem(
                                    selected = currentScreen == "POD",
                                    onClick = { currentScreen = "POD" },
                                    icon = { Icon(Icons.Default.CheckCircle, contentDescription = "POD Signature") },
                                    label = { Text("POD") },
                                    colors = NavigationBarItemDefaults.colors(
                                        selectedIconColor = Color(0xFF1D4ED8),
                                        selectedTextColor = Color(0xFF1D4ED8),
                                        unselectedIconColor = Color(0xFF64748B),
                                        unselectedTextColor = Color(0xFF64748B),
                                        indicatorColor = Color(0xFFEFF6FF)
                                    )
                                )
                            }
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
                                    onVehicleSelect = { selectedVehicle ->
                                        driverVehicle = selectedVehicle
                                        prefs.edit().putString("driver_vehicle", selectedVehicle).apply()
                                        com.fleet.delivery.util.FleetNotificationManager.showOperationalAlert(
                                            this@MainActivity,
                                            "VEHICLE_SWITCHED",
                                            "Trip Vehicle Selected",
                                            "Active vehicle updated to $selectedVehicle. Ready for parcel dispatch."
                                        )
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
