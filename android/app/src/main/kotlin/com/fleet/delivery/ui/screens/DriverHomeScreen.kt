package com.fleet.delivery.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun DriverHomeScreen(
    driverName: String = "Kiran Kumar",
    vehicleNumber: String = "KA-04-AB-1234 (Tata Ace)",
    isVehicleMoving: Boolean = false,
    onViewJobClick: (String) -> Unit,
    onDutyToggle: (Boolean) -> Unit,
    onLogoutClick: () -> Unit = {}
) {
    var isDutyActive by remember { mutableStateOf(true) }
    var showLogoutDialog by remember { mutableStateOf(false) }
    val scrollState = rememberScrollState()

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("Log Out?", fontWeight = FontWeight.Bold) },
            text = { Text("Are you sure you want to log out of Fleet Driver? Your active GPS duty tracking will be stopped.") },
            confirmButton = {
                Button(
                    onClick = {
                        showLogoutDialog = false
                        onLogoutClick()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
                ) {
                    Text("Log Out")
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text("Cancel")
                }
            },
            containerColor = Color(0xFF1E293B),
            titleContentColor = Color.White,
            textContentColor = Color(0xFFCBD5E1)
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
            .verticalScroll(scrollState)
            .padding(16.dp)
    ) {
        // Driver Safety Banner (Section 62 Requirement)
        if (isVehicleMoving) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF7F1D1D)),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = "Safety Alert",
                        tint = Color.White,
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = "Vehicle in Motion. Drive safely. Pull over before interacting.",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }
        }

        // Header & Duty Toggle
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Welcome, $driverName",
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Vehicle: $vehicleNumber",
                    color = Color(0xFF94A3B8),
                    fontSize = 12.sp
                )
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = if (isDutyActive) "ON DUTY" else "OFF DUTY",
                    color = if (isDutyActive) Color(0xFF10B981) else Color(0xFF94A3B8),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(end = 4.dp)
                )
                Switch(
                    checked = isDutyActive,
                    onCheckedChange = {
                        isDutyActive = it
                        onDutyToggle(it)
                    },
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Color.White,
                        checkedTrackColor = Color(0xFF10B981)
                    )
                )

                Spacer(modifier = Modifier.width(8.dp))

                // Logout Button
                IconButton(
                    onClick = { showLogoutDialog = true },
                    modifier = Modifier
                        .size(36.dp)
                        .background(Color(0xFF334155), shape = RoundedCornerShape(8.dp))
                ) {
                    Icon(
                        imageVector = Icons.Default.Logout,
                        contentDescription = "Logout",
                        tint = Color(0xFFF87171),
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Daily Metric Cards
        Text(
            text = "TODAY'S DISPATCH PERFORMANCE",
            color = Color(0xFF64748B),
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp
        )

        Spacer(modifier = Modifier.height(8.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text("Today's Jobs", color = Color(0xFF94A3B8), fontSize = 11.sp)
                    Text("5", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                    Text("3 Completed", color = Color(0xFF10B981), fontSize = 10.sp)
                }
            }

            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text("Validated Distance", color = Color(0xFF94A3B8), fontSize = 11.sp)
                    Text("86.4 km", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                    Text("GPS Verified", color = Color(0xFF38BDF8), fontSize = 10.sp)
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Active Job Card
        Text(
            text = "ACTIVE JOB ASSIGNMENT",
            color = Color(0xFF64748B),
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp
        )

        Spacer(modifier = Modifier.height(8.dp))

        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "JOB #10045",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                    Surface(
                        color = Color(0xFF064E3B),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(
                            text = "IN PROGRESS",
                            color = Color(0xFF34D399),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Place,
                        contentDescription = "Pickup",
                        tint = Color(0xFF38BDF8),
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Pickup: Alpha Wholesale (Peenya)",
                        color = Color(0xFFE2E8F0),
                        fontSize = 13.sp
                    )
                }

                Spacer(modifier = Modifier.height(6.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Navigation,
                        contentDescription = "Delivery",
                        tint = Color(0xFFA855F7),
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Delivery: Metro Hypermarket (Malleshwaram)",
                        color = Color(0xFFE2E8F0),
                        fontSize = 13.sp
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Button(
                    onClick = { onViewJobClick("JOB-10045") },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF059669)),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("VIEW JOB & STOPS", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
