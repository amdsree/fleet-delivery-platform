package com.fleet.delivery.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import android.content.Context
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation

data class DriverHistoryItem(
    val jobNumber: String,
    val pickup: String,
    val delivery: String,
    val cargo: String,
    val date: String,
    val time: String,
    val podSigned: Boolean = true
)

data class DriverVehicleOption(
    val regNumber: String,
    val model: String,
    val category: String,
    val capacityKg: Int,
    val description: String,
    val parcelFit: String,
    val status: String = "AVAILABLE",
    val busyWithDriver: String? = null
)

@Composable
fun DriverHomeScreen(
    driverName: String = "Kiran Kumar",
    vehicleNumber: String = "KA-04-AB-1234 (Tata Ace)",
    isVehicleMoving: Boolean = false,
    onViewJobClick: (String) -> Unit,
    onDutyToggle: (Boolean) -> Unit,
    onVehicleSelect: (String) -> Unit = {},
    onLogoutClick: () -> Unit = {}
) {
    var isDutyActive by remember { mutableStateOf(true) }
    var showLogoutDialog by remember { mutableStateOf(false) }
    var showVehicleSelectorDialog by remember { mutableStateOf(false) }
    var showChangePasswordDialog by remember { mutableStateOf(false) }
    var selectedVehicle by remember(vehicleNumber) { mutableStateOf(vehicleNumber) }
    var vehicleSwitchedMessage by remember { mutableStateOf<String?>(null) }
    var driverTab by remember { mutableStateOf("ACTIVE") } // "ACTIVE" or "HISTORY"
    var selectedDateFilter by remember { mutableStateOf("All Dates") }
    val scrollState = rememberScrollState()

    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("roditte_fleet_prefs", Context.MODE_PRIVATE) }

    LaunchedEffect(isDutyActive) {
        onDutyToggle(isDutyActive)
    }

    val fleetVehicleOptions = remember(selectedVehicle) {
        listOf(
            DriverVehicleOption(
                regNumber = "KA-04-AB-1234",
                model = "Tata Ace Gold",
                category = "Medium Consignment",
                capacityKg = 750,
                description = "Standard Mini Truck • 750 kg Payload",
                parcelFit = "Best for: 20-500 kg FMCG Cartons, Retail Boxes",
                status = "AVAILABLE"
            ),
            DriverVehicleOption(
                regNumber = "KA-05-CD-5678",
                model = "Eicher Pro 1049",
                category = "Heavy Freight Carrier",
                capacityKg = 2500,
                description = "Heavy Distribution Truck • 2,500 kg Payload",
                parcelFit = "Best for: > 500 kg Industrial Pallets & Barrels",
                status = "IN_TRIP",
                busyWithDriver = "Ramesh Babu (Job #10041 - Whitefield)"
            ),
            DriverVehicleOption(
                regNumber = "KA-51-EF-9012",
                model = "Mahindra Bolero Maxi",
                category = "Medium-Heavy Pickup",
                capacityKg = 1200,
                description = "High-Payload Pickup • 1,200 kg Payload",
                parcelFit = "Best for: Wholesale Bags, Heavy Merchandise",
                status = "AVAILABLE"
            ),
            DriverVehicleOption(
                regNumber = "KA-03-GH-3456",
                model = "Piaggio Ape Electric",
                category = "Small Parcel Express",
                capacityKg = 500,
                description = "Electric 3-Wheeler • 500 kg Payload",
                parcelFit = "Best for: < 20 kg Express, Documents, Small Parcels",
                status = "AVAILABLE"
            ),
            DriverVehicleOption(
                regNumber = "KA-04-AL-9012",
                model = "Ashok Leyland Dost+",
                category = "Commercial Light",
                capacityKg = 1500,
                description = "Light Commercial Truck • 1,500 kg Payload",
                parcelFit = "Best for: Bulky Consignments, High Deck Loads",
                status = "AVAILABLE"
            )
        )
    }

    val myHistoryDeliveries = listOf(
        DriverHistoryItem(
            jobNumber = "JOB #10042",
            pickup = "Peenya Central Godown",
            delivery = "Yeshwanthpur Industrial Complex",
            cargo = "30 Barrels Chemical Solvents (300 kg)",
            date = "Today",
            time = "Today, 02:40 PM"
        ),
        DriverHistoryItem(
            jobNumber = "JOB #10039",
            pickup = "Peenya Central Godown",
            delivery = "Jayanagar Commercial Street",
            cargo = "25 Sacks Organic Grains (500 kg)",
            date = "Oct 6, 2026",
            time = "Oct 6, 04:45 PM"
        ),
        DriverHistoryItem(
            jobNumber = "JOB #10035",
            pickup = "Peenya Central Godown",
            delivery = "Rajajinagar Trade Center",
            cargo = "18 Cartons Auto Spares (140 kg)",
            date = "Oct 5, 2026",
            time = "Oct 5, 01:20 PM"
        )
    )

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("Log Out?", fontWeight = FontWeight.Bold, color = Color(0xFF0F172A)) },
            text = { Text("Are you sure you want to log out of Roditte Fleet Driver? Your active GPS duty tracking will be stopped.", color = Color(0xFF334155)) },
            confirmButton = {
                Button(
                    onClick = {
                        showLogoutDialog = false
                        onLogoutClick()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                ) {
                    Text("Log Out")
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text("Cancel", color = Color(0xFF64748B))
                }
            },
            containerColor = Color.White,
            titleContentColor = Color(0xFF0F172A),
            textContentColor = Color(0xFF334155)
        )
    }

    // DRIVER CHANGE PASSWORD DIALOG
    if (showChangePasswordDialog) {
        var oldPasswordInput by remember { mutableStateOf("") }
        var newPasswordInput by remember { mutableStateOf("") }
        var confirmPasswordInput by remember { mutableStateOf("") }
        var isOldVisible by remember { mutableStateOf(false) }
        var isNewVisible by remember { mutableStateOf(false) }
        var isConfirmVisible by remember { mutableStateOf(false) }
        var pwdError by remember { mutableStateOf<String?>(null) }

        AlertDialog(
            onDismissRequest = { showChangePasswordDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        color = Color(0xFFEFF6FF),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.size(36.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Lock, contentDescription = null, tint = Color(0xFF1D4ED8), modifier = Modifier.size(18.dp))
                        }
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text("Change Password", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF0F172A))
                        Text("Driver: $driverName", fontSize = 11.sp, color = Color(0xFF64748B))
                    }
                }
            },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "Default password is Driver@12345. Update your password to secure your account.",
                        fontSize = 11.sp,
                        color = Color(0xFF475569)
                    )

                    if (pwdError != null) {
                        Surface(
                            color = Color(0xFFFEE2E2),
                            shape = RoundedCornerShape(6.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = pwdError!!,
                                color = Color(0xFFDC2626),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                modifier = Modifier.padding(8.dp)
                            )
                        }
                    }

                    OutlinedTextField(
                        value = oldPasswordInput,
                        onValueChange = { oldPasswordInput = it; pwdError = null },
                        label = { Text("Current Password") },
                        singleLine = true,
                        visualTransformation = if (isOldVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        trailingIcon = {
                            IconButton(onClick = { isOldVisible = !isOldVisible }) {
                                Icon(if (isOldVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff, contentDescription = null, tint = Color(0xFF64748B))
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = newPasswordInput,
                        onValueChange = { newPasswordInput = it; pwdError = null },
                        label = { Text("New Password (min 6 chars)") },
                        singleLine = true,
                        visualTransformation = if (isNewVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        trailingIcon = {
                            IconButton(onClick = { isNewVisible = !isNewVisible }) {
                                Icon(if (isNewVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff, contentDescription = null, tint = Color(0xFF64748B))
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = confirmPasswordInput,
                        onValueChange = { confirmPasswordInput = it; pwdError = null },
                        label = { Text("Confirm New Password") },
                        singleLine = true,
                        visualTransformation = if (isConfirmVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        trailingIcon = {
                            IconButton(onClick = { isConfirmVisible = !isConfirmVisible }) {
                                Icon(if (isConfirmVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff, contentDescription = null, tint = Color(0xFF64748B))
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val currentStored = prefs.getString("custom_pwd_$driverName", null)
                            ?: prefs.getString("custom_pwd_${prefs.getString("user_email", "")}", null)
                            ?: "Driver@12345"

                        if (oldPasswordInput.trim() != currentStored && oldPasswordInput.trim() != "Driver@12345") {
                            pwdError = "Current password does not match."
                        } else if (newPasswordInput.trim().length < 6) {
                            pwdError = "New password must be at least 6 characters."
                        } else if (newPasswordInput.trim() != confirmPasswordInput.trim()) {
                            pwdError = "New passwords do not match."
                        } else {
                            val newPass = newPasswordInput.trim()
                            val userEmailOrPhone = prefs.getString("user_email", "") ?: ""
                            val digitsOnly = userEmailOrPhone.replace(Regex("[^0-9]"), "")

                            prefs.edit()
                                .putString("custom_pwd_$driverName", newPass)
                                .putString("custom_pwd_$userEmailOrPhone", newPass)
                                .apply()

                            if (digitsOnly.length >= 10) {
                                prefs.edit().putString("custom_pwd_$digitsOnly", newPass).apply()
                            }

                            vehicleSwitchedMessage = "Password changed successfully! Please use it on your next sign-in."
                            showChangePasswordDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1D4ED8))
                ) {
                    Text("Update Password")
                }
            },
            dismissButton = {
                TextButton(onClick = { showChangePasswordDialog = false }) {
                    Text("Cancel")
                }
            },
            containerColor = Color.White,
            titleContentColor = Color(0xFF0F172A),
            textContentColor = Color(0xFF334155)
        )
    }

    // VEHICLE SELECTION DIALOG (For idle driver fulfilling order / starting trip)
    if (showVehicleSelectorDialog) {
        AlertDialog(
            onDismissRequest = { showVehicleSelectorDialog = false },
            title = {
                Column {
                    Text("Select Vehicle for Trip", fontWeight = FontWeight.Bold, color = Color(0xFF0F172A), fontSize = 17.sp)
                    Spacer(modifier = Modifier.height(2.dp))
                    Text("Choose vehicle matching upcoming parcel weight & volume", color = Color(0xFF64748B), fontSize = 11.sp)
                }
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 420.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    fleetVehicleOptions.forEach { v ->
                        val fullLabel = "${v.regNumber} (${v.model})"
                        val isChosen = selectedVehicle.contains(v.regNumber) || selectedVehicle == fullLabel
                        val isBusy = v.status == "IN_TRIP" || v.status == "BUSY"

                        Surface(
                            color = when {
                                isBusy -> Color(0xFFFFFBEB)
                                isChosen -> Color(0xFFEFF6FF)
                                else -> Color.White
                            },
                            shape = RoundedCornerShape(10.dp),
                            border = BorderStroke(
                                1.5.dp,
                                when {
                                    isBusy -> Color(0xFFF59E0B)
                                    isChosen -> Color(0xFF1D4ED8)
                                    else -> Color(0xFFE2E8F0)
                                }
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    if (isBusy) {
                                        vehicleSwitchedMessage = "Cannot select ${v.model}: Vehicle is currently in run on active trip."
                                    } else {
                                        selectedVehicle = fullLabel
                                        vehicleSwitchedMessage = "Switched to ${v.model} (${v.regNumber})"
                                        onVehicleSelect(fullLabel)
                                        showVehicleSelectorDialog = false
                                    }
                                }
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            imageVector = Icons.Default.LocalShipping,
                                            contentDescription = null,
                                            tint = when {
                                                isBusy -> Color(0xFFDC2626)
                                                isChosen -> Color(0xFF1D4ED8)
                                                else -> Color(0xFF64748B)
                                            },
                                            modifier = Modifier.size(18.dp)
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            text = v.model,
                                            fontWeight = FontWeight.Bold,
                                            color = when {
                                                isBusy -> Color(0xFF991B1B)
                                                isChosen -> Color(0xFF1D4ED8)
                                                else -> Color(0xFF0F172A)
                                            },
                                            fontSize = 13.sp
                                        )
                                    }
                                    if (isBusy) {
                                        Surface(
                                            color = Color(0xFFDC2626),
                                            shape = RoundedCornerShape(4.dp)
                                        ) {
                                            Text(
                                                "BUSY - IN RUN",
                                                color = Color.White,
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                            )
                                        }
                                    } else if (isChosen) {
                                        Surface(
                                            color = Color(0xFF1D4ED8),
                                            shape = RoundedCornerShape(4.dp)
                                        ) {
                                            Text(
                                                "ACTIVE",
                                                color = Color.White,
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                            )
                                        }
                                    } else {
                                        Surface(
                                            color = Color(0xFFECFDF5),
                                            shape = RoundedCornerShape(4.dp),
                                            border = BorderStroke(1.dp, Color(0xFFA7F3D0))
                                        ) {
                                            Text(
                                                "AVAILABLE",
                                                color = Color(0xFF059669),
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                            )
                                        }
                                    }
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Reg: ${v.regNumber} • Payload: ${v.capacityKg} kg (${v.category})",
                                    color = Color(0xFF334155),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Medium
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                if (isBusy) {
                                    Text(
                                        text = "⛔ Currently in run: ${v.busyWithDriver ?: "Trip in progress"}",
                                        color = Color(0xFFDC2626),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                } else {
                                    Text(
                                        text = v.parcelFit,
                                        color = Color(0xFF059669),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showVehicleSelectorDialog = false }) {
                    Text("Close", color = Color(0xFF64748B))
                }
            },
            containerColor = Color.White,
            titleContentColor = Color(0xFF0F172A),
            textContentColor = Color(0xFF334155)
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF8FAFC))
            .verticalScroll(scrollState)
            .padding(16.dp)
    ) {
        // Driver Safety Banner (Section 62 Requirement)
        if (isVehicleMoving) {
            Surface(
                color = Color(0xFFFEF2F2),
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, Color(0xFFFECACA)),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 14.dp)
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = "Safety Alert",
                        tint = Color(0xFFDC2626),
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = "Vehicle in Motion. Drive safely. Pull over before interacting.",
                        color = Color(0xFF991B1B),
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                }
            }
        }

        // Header & Duty Toggle - Medium White & Blue Enterprise Card
        Surface(
            color = Color.White,
            shape = RoundedCornerShape(14.dp),
            border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
            shadowElevation = 2.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        color = Color(0xFFEFF6FF),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.size(40.dp),
                        border = BorderStroke(1.dp, Color(0xFFBFDBFE))
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Default.LocalShipping,
                                contentDescription = null,
                                tint = Color(0xFF1D4ED8),
                                modifier = Modifier.size(22.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = "Welcome, $driverName",
                            color = Color(0xFF0F172A),
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = selectedVehicle,
                            color = Color(0xFF64748B),
                            fontSize = 11.sp
                        )
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        color = if (isDutyActive) Color(0xFFDCFCE7) else Color(0xFFF1F5F9),
                        shape = RoundedCornerShape(6.dp),
                        border = BorderStroke(1.dp, if (isDutyActive) Color(0xFFBBF7D0) else Color(0xFFCBD5E1))
                    ) {
                        Text(
                            text = if (isDutyActive) "ON DUTY" else "OFF DUTY",
                            color = if (isDutyActive) Color(0xFF15803D) else Color(0xFF64748B),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(6.dp))
                    Switch(
                        checked = isDutyActive,
                        onCheckedChange = {
                            isDutyActive = it
                            onDutyToggle(it)
                        },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color.White,
                            checkedTrackColor = Color(0xFF16A34A),
                            uncheckedThumbColor = Color.White,
                            uncheckedTrackColor = Color(0xFFCBD5E1)
                        )
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    IconButton(
                        onClick = { showChangePasswordDialog = true },
                        modifier = Modifier
                            .size(34.dp)
                            .background(Color(0xFFEFF6FF), shape = RoundedCornerShape(8.dp))
                    ) {
                        Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = "Change Password",
                            tint = Color(0xFF1D4ED8),
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(6.dp))
                    IconButton(
                        onClick = { showLogoutDialog = true },
                        modifier = Modifier
                            .size(34.dp)
                            .background(Color(0xFFFEE2E2), shape = RoundedCornerShape(8.dp))
                    ) {
                        Icon(
                            imageVector = Icons.Default.Logout,
                            contentDescription = "Logout",
                            tint = Color(0xFFDC2626),
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }
        }

        // Feedback banner when vehicle is selected
        if (vehicleSwitchedMessage != null) {
            Surface(
                color = Color(0xFFDCFCE7),
                shape = RoundedCornerShape(8.dp),
                border = BorderStroke(1.dp, Color(0xFF86EFAC)),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 10.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF16A34A), modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(vehicleSwitchedMessage!!, color = Color(0xFF15803D), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // TRIP VEHICLE SELECTION CARD (Available when driver is idle / preparing for trip)
        Surface(
            color = Color.White,
            shape = RoundedCornerShape(12.dp),
            border = BorderStroke(1.dp, Color(0xFFBFDBFE)),
            shadowElevation = 1.dp,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 10.dp)
                .clickable { showVehicleSelectorDialog = true }
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                    Surface(
                        color = Color(0xFFEFF6FF),
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, Color(0xFFBFDBFE)),
                        modifier = Modifier.size(38.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Default.LocalShipping,
                                contentDescription = null,
                                tint = Color(0xFF1D4ED8),
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = "TRIP VEHICLE (PARCEL SIZING)",
                            color = Color(0xFF1D4ED8),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.5.sp
                        )
                        Text(
                            text = selectedVehicle,
                            color = Color(0xFF0F172A),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = if (isDutyActive) "Ready for dispatch • Tap to change vehicle" else "Off Duty",
                            color = if (isDutyActive) Color(0xFF059669) else Color(0xFF64748B),
                            fontSize = 10.sp
                        )
                    }
                }
                OutlinedButton(
                    onClick = { showVehicleSelectorDialog = true },
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF1D4ED8)),
                    border = BorderStroke(1.dp, Color(0xFF1D4ED8)),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Text("Select Vehicle", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Daily Metric Cards - Professional White & Blue
        Text(
            text = "TODAY'S DISPATCH PERFORMANCE",
            color = Color(0xFF64748B),
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 0.8.sp
        )

        Spacer(modifier = Modifier.height(8.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
                modifier = Modifier
                    .weight(1f)
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp)),
                shape = RoundedCornerShape(12.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text("Today's Jobs", color = Color(0xFF64748B), fontSize = 11.sp)
                    Text("5", color = Color(0xFF0F172A), fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    Surface(
                        color = Color(0xFFDCFCE7),
                        shape = RoundedCornerShape(4.dp),
                        modifier = Modifier.padding(top = 2.dp)
                    ) {
                        Text("3 Completed", color = Color(0xFF15803D), fontSize = 9.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp))
                    }
                }
            }

            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
                modifier = Modifier
                    .weight(1f)
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp)),
                shape = RoundedCornerShape(12.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text("Validated Distance", color = Color(0xFF64748B), fontSize = 11.sp)
                    Text("86.4 km", color = Color(0xFF1D4ED8), fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    Surface(
                        color = Color(0xFFEFF6FF),
                        shape = RoundedCornerShape(4.dp),
                        modifier = Modifier.padding(top = 2.dp)
                    ) {
                        Text("GPS Verified", color = Color(0xFF1D4ED8), fontSize = 9.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp))
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // TAB SELECTOR: Active Job vs Delivery History
        Surface(
            color = Color(0xFFF1F5F9),
            shape = RoundedCornerShape(10.dp),
            modifier = Modifier.fillMaxWidth(),
            border = BorderStroke(1.dp, Color(0xFFE2E8F0))
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(3.dp)
            ) {
                Surface(
                    color = if (driverTab == "ACTIVE") Color(0xFF1D4ED8) else Color.Transparent,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .weight(1f)
                        .clickable { driverTab = "ACTIVE" }
                ) {
                    Row(
                        modifier = Modifier.padding(vertical = 8.dp),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.LocalShipping,
                            contentDescription = null,
                            tint = if (driverTab == "ACTIVE") Color.White else Color(0xFF64748B),
                            modifier = Modifier.size(15.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            "Active Job",
                            color = if (driverTab == "ACTIVE") Color.White else Color(0xFF475569),
                            fontSize = 12.sp,
                            fontWeight = if (driverTab == "ACTIVE") FontWeight.Bold else FontWeight.Medium
                        )
                    }
                }

                Surface(
                    color = if (driverTab == "HISTORY") Color(0xFF1D4ED8) else Color.Transparent,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .weight(1f)
                        .clickable { driverTab = "HISTORY" }
                ) {
                    Row(
                        modifier = Modifier.padding(vertical = 8.dp),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.History,
                            contentDescription = null,
                            tint = if (driverTab == "HISTORY") Color.White else Color(0xFF64748B),
                            modifier = Modifier.size(15.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            "Delivery History (${myHistoryDeliveries.size})",
                            color = if (driverTab == "HISTORY") Color.White else Color(0xFF475569),
                            fontSize = 12.sp,
                            fontWeight = if (driverTab == "HISTORY") FontWeight.Bold else FontWeight.Medium
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        if (driverTab == "ACTIVE") {
            // Active Job Card
            Text(
                text = "ACTIVE JOB ASSIGNMENT",
                color = Color(0xFF64748B),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.8.sp
            )

            Spacer(modifier = Modifier.height(8.dp))

            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFFBFDBFE), RoundedCornerShape(14.dp)),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "JOB #10045",
                            color = Color(0xFF0F172A),
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                        Surface(
                            color = Color(0xFFEFF6FF),
                            shape = RoundedCornerShape(6.dp),
                            border = BorderStroke(1.dp, Color(0xFFBFDBFE))
                        ) {
                            Text(
                                text = "IN PROGRESS",
                                color = Color(0xFF1D4ED8),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Place,
                            contentDescription = "Pickup",
                            tint = Color(0xFF059669),
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Pickup: Alpha Wholesale (Peenya Central)",
                            color = Color(0xFF334155),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Navigation,
                            contentDescription = "Delivery",
                            tint = Color(0xFF1D4ED8),
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Delivery: Metro Hypermarket (Malleshwaram)",
                            color = Color(0xFF334155),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Surface(
                        color = Color(0xFFF8FAFC),
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 10.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                Icon(Icons.Default.LocalShipping, contentDescription = null, tint = Color(0xFF1D4ED8), modifier = Modifier.size(15.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Column {
                                    Text("Trip Vehicle Selected", color = Color(0xFF64748B), fontSize = 9.sp, fontWeight = FontWeight.Medium)
                                    Text(selectedVehicle, color = Color(0xFF0F172A), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                            TextButton(
                                onClick = { showVehicleSelectorDialog = true },
                                contentPadding = PaddingValues(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text("Change", color = Color(0xFF1D4ED8), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Button(
                        onClick = { onViewJobClick("JOB-10045") },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1D4ED8)),
                        shape = RoundedCornerShape(10.dp),
                        elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Navigation, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("VIEW JOB & STOPS", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                }
            }
        } else {
            // Delivery History for Driver
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "COMPLETED DELIVERIES ARCHIVE",
                    color = Color(0xFF64748B),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.8.sp
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Date filter row
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Date:",
                    color = Color(0xFF475569),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.width(42.dp)
                )
                val driverDates = listOf("All Dates", "Today", "Oct 6, 2026", "Oct 5, 2026")
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items(driverDates) { dOpt ->
                        val isSelected = selectedDateFilter == dOpt
                        Surface(
                            color = if (isSelected) Color(0xFF1D4ED8) else Color.White,
                            shape = RoundedCornerShape(14.dp),
                            border = BorderStroke(1.dp, if (isSelected) Color(0xFF1D4ED8) else Color(0xFFE2E8F0)),
                            modifier = Modifier.clickable { selectedDateFilter = dOpt }
                        ) {
                            Text(
                                text = dOpt,
                                color = if (isSelected) Color.White else Color(0xFF334155),
                                fontSize = 11.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            val filteredHistory = myHistoryDeliveries.filter {
                if (selectedDateFilter == "All Dates") true
                else it.date == selectedDateFilter
            }

            if (filteredHistory.isEmpty()) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp))
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(Icons.Default.History, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(32.dp))
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("No deliveries found for $selectedDateFilter", color = Color(0xFF64748B), fontSize = 12.sp)
                    }
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    filteredHistory.forEach { h ->
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp)),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = h.jobNumber,
                                        color = Color(0xFF0F172A),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp
                                    )
                                    Surface(
                                        color = Color(0xFFDCFCE7),
                                        shape = RoundedCornerShape(6.dp),
                                        border = BorderStroke(1.dp, Color(0xFFBBF7D0))
                                    ) {
                                        Text(
                                            text = "DELIVERED",
                                            color = Color(0xFF15803D),
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = "🕒 Delivered: ${h.time}",
                                    color = Color(0xFF64748B),
                                    fontSize = 11.sp
                                )

                                Spacer(modifier = Modifier.height(6.dp))
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Place, contentDescription = null, tint = Color(0xFF059669), modifier = Modifier.size(13.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("From: ${h.pickup}", color = Color(0xFF334155), fontSize = 11.sp)
                                }
                                Spacer(modifier = Modifier.height(2.dp))
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Navigation, contentDescription = null, tint = Color(0xFF1D4ED8), modifier = Modifier.size(13.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("To: ${h.delivery}", color = Color(0xFF334155), fontSize = 11.sp)
                                }

                                Spacer(modifier = Modifier.height(6.dp))
                                Text("📦 ${h.cargo}", color = Color(0xFF64748B), fontSize = 10.sp)

                                Spacer(modifier = Modifier.height(8.dp))
                                Surface(
                                    color = Color(0xFFEFF6FF),
                                    shape = RoundedCornerShape(4.dp),
                                    border = BorderStroke(1.dp, Color(0xFFBFDBFE))
                                ) {
                                    Text(
                                        text = "✓ Proof of Delivery Verified & Archived",
                                        color = Color(0xFF1D4ED8),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Medium,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
