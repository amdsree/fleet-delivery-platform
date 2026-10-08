package com.fleet.delivery.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
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
import com.fleet.delivery.data.remote.ApiClient
import kotlinx.coroutines.launch

data class UiJobItem(
    val id: String,
    val jobNumber: String,
    val status: String,
    val pickupName: String,
    val deliveryName: String,
    val cargoDetails: String,
    val assignedDriver: String,
    val priority: String,
    val timeAgo: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StaffOperationsScreen(
    userName: String,
    userRole: String, // "ADMIN", "GODOWN_MANAGER", "SALES_STAFF"
    userEmail: String,
    onLogoutClick: () -> Unit
) {
    var showLogoutDialog by remember { mutableStateOf(false) }
    var showAddJobModal by remember { mutableStateOf(false) }

    // Job Creation Form State
    var selectedPickup by remember { mutableStateOf("Peenya Central Godown") }
    var selectedDelivery by remember { mutableStateOf("Metro Hypermarket Malleshwaram") }
    var cargoDescription by remember { mutableStateOf("FMCG Consignment (40 Cases)") }
    var quantityText by remember { mutableStateOf("40") }
    var weightText by remember { mutableStateOf("250") }
    var priorityText by remember { mutableStateOf("High Priority") }
    var assignMode by remember { mutableStateOf("AUTO") } // "AUTO" or "MANUAL"
    var selectedDriver by remember { mutableStateOf("Driver 1 (Kiran Kumar)") }

    var successMessage by remember { mutableStateOf<String?>(null) }
    val coroutineScope = rememberCoroutineScope()

    // Jobs list
    var jobsList by remember {
        mutableStateOf(
            listOf(
                UiJobItem(
                    id = "1",
                    jobNumber = "JOB #10045",
                    status = "IN PROGRESS",
                    pickupName = "Peenya Central Godown",
                    deliveryName = "Metro Hypermarket Malleshwaram",
                    cargoDetails = "50 Cartons Packaged Foods (350 kg)",
                    assignedDriver = "Kiran Kumar (KA-04-AB-1234)",
                    priority = "High",
                    timeAgo = "12 mins ago"
                ),
                UiJobItem(
                    id = "2",
                    jobNumber = "JOB #10044",
                    status = "OFFERED",
                    pickupName = "Whitefield Depot",
                    deliveryName = "Indiranagar Retail Outlet",
                    cargoDetails = "20 Barrels Lubricant (200 kg)",
                    assignedDriver = "Ramesh Babu (KA-05-CD-5678)",
                    priority = "Normal",
                    timeAgo = "25 mins ago"
                ),
                UiJobItem(
                    id = "3",
                    jobNumber = "JOB #10043",
                    status = "COMPLETED",
                    pickupName = "Electronic City Warehouse",
                    deliveryName = "Koramangala Logistics Bay",
                    cargoDetails = "15 Crates Electronics (120 kg)",
                    assignedDriver = "Sunil V (KA-51-EF-9012)",
                    priority = "Critical",
                    timeAgo = "1 hour ago"
                )
            )
        )
    }

    val roleLabel = when (userRole) {
        "ADMIN" -> "SUPER ADMINISTRATOR"
        "GODOWN_MANAGER" -> "GODOWN OPERATIONS MANAGER"
        "SALES_STAFF" -> "SALES & DISPATCH DESK"
        else -> userRole
    }

    val roleColor = when (userRole) {
        "ADMIN" -> Color(0xFF10B981) // Emerald
        "GODOWN_MANAGER" -> Color(0xFFF59E0B) // Amber
        "SALES_STAFF" -> Color(0xFF38BDF8) // Sky
        else -> Color(0xFF94A3B8)
    }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("Log Out?", fontWeight = FontWeight.Bold) },
            text = { Text("Are you sure you want to log out of FleetOps Management Console?") },
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
            .padding(16.dp)
    ) {
        // TOP HEADER BAR
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Welcome, $userName",
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 2.dp)) {
                    Surface(
                        color = roleColor.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(4.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, roleColor.copy(alpha = 0.5f))
                    ) {
                        Text(
                            text = roleLabel,
                            color = roleColor,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "🟢 Render Cloud Active",
                        color = Color(0xFF64748B),
                        fontSize = 10.sp
                    )
                }
            }

            // Logout Button
            IconButton(
                onClick = { showLogoutDialog = true },
                modifier = Modifier
                    .size(38.dp)
                    .background(Color(0xFF1E293B), shape = RoundedCornerShape(10.dp))
            ) {
                Icon(
                    imageVector = Icons.Default.Logout,
                    contentDescription = "Logout",
                    tint = Color(0xFFF87171),
                    modifier = Modifier.size(20.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // SUCCESS TOAST
        if (successMessage != null) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF064E3B)),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp)
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF34D399), modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(text = successMessage!!, color = Color(0xFFD1FAE5), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }

        // PRIMARY ACTION CARD: + ADD DELIVERY JOB
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF10B981)),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier
                .fillMaxWidth()
                .clickable { showAddJobModal = true }
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(18.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .background(Color.White.copy(alpha = 0.2f), shape = RoundedCornerShape(12.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.AddCircle,
                            contentDescription = "Add Job",
                            tint = Color.White,
                            modifier = Modifier.size(28.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(14.dp))
                    Column {
                        Text(
                            text = "+ ADD DELIVERY JOB",
                            color = Color.White,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.ExtraBold,
                            letterSpacing = 0.5.sp
                        )
                        Text(
                            text = "Dispatch consignment to driver & warehouse",
                            color = Color.White.copy(alpha = 0.85f),
                            fontSize = 11.sp
                        )
                    }
                }
                Icon(
                    imageVector = Icons.Default.ArrowForward,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(22.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // ROLE SPECIFIC OPERATIONAL WIDGET
        when (userRole) {
            "GODOWN_MANAGER" -> {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Warehouse, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Godown Loading Bay Desk", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "2 drivers queued for pickup • Dock 1 & Dock 3 active • Geofence arrivals automatically notified",
                            color = Color(0xFF94A3B8),
                            fontSize = 11.sp
                        )
                    }
                }
                Spacer(modifier = Modifier.height(14.dp))
            }
            "SALES_STAFF" -> {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.ShoppingCart, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Sales Order & Job Booking Desk", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Enter customer delivery consignments • Auto-dispatch triggers push notifications across warehouse & drivers",
                            color = Color(0xFF94A3B8),
                            fontSize = 11.sp
                        )
                    }
                }
                Spacer(modifier = Modifier.height(14.dp))
            }
            "ADMIN" -> {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Text("Active Drivers", color = Color(0xFF94A3B8), fontSize = 10.sp)
                            Text("5", color = Color(0xFF10B981), fontSize = 18.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Text("Vehicles", color = Color(0xFF94A3B8), fontSize = 10.sp)
                            Text("5", color = Color(0xFF38BDF8), fontSize = 18.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Text("Godowns", color = Color(0xFF94A3B8), fontSize = 10.sp)
                            Text("5", color = Color(0xFFF59E0B), fontSize = 18.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
                Spacer(modifier = Modifier.height(14.dp))
            }
        }

        // ACTIVE FLEET JOBS FEED HEADER
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "ACTIVE DISPATCH JOBS",
                color = Color(0xFF64748B),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp
            )
            Text(
                text = "${jobsList.size} Jobs",
                color = Color(0xFF94A3B8),
                fontSize = 11.sp
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        // JOBS LIST
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.weight(1f)
        ) {
            items(jobsList) { job ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = job.jobNumber,
                                color = Color.White,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold
                            )
                            val statusBg = when (job.status) {
                                "IN PROGRESS" -> Color(0xFF7C3AED)
                                "OFFERED" -> Color(0xFF0284C7)
                                "COMPLETED" -> Color(0xFF059669)
                                else -> Color(0xFF475569)
                            }
                            Surface(
                                color = statusBg.copy(alpha = 0.2f),
                                shape = RoundedCornerShape(6.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, statusBg.copy(alpha = 0.6f))
                            ) {
                                Text(
                                    text = job.status,
                                    color = statusBg,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        // Route
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(text = "From: ${job.pickupName}", color = Color(0xFFCBD5E1), fontSize = 11.sp)
                        }
                        Spacer(modifier = Modifier.height(3.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Navigation, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(text = "To: ${job.deliveryName}", color = Color(0xFFCBD5E1), fontSize = 11.sp)
                        }

                        Spacer(modifier = Modifier.height(8.dp))
                        HorizontalDivider(color = Color(0xFF334155))
                        Spacer(modifier = Modifier.height(8.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(text = "Driver: ${job.assignedDriver}", color = Color(0xFF94A3B8), fontSize = 11.sp)
                            Text(text = job.timeAgo, color = Color(0xFF64748B), fontSize = 10.sp)
                        }
                    }
                }
            }
        }
    }

    // MODAL DIALOG: + ADD DELIVERY JOB
    if (showAddJobModal) {
        AlertDialog(
            onDismissRequest = { showAddJobModal = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.AddCircle, contentDescription = null, tint = Color(0xFF10B981))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Add New Delivery Job", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "Authorized Role: $roleLabel",
                        color = roleColor,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )

                    // Pickup Godown
                    OutlinedTextField(
                        value = selectedPickup,
                        onValueChange = { selectedPickup = it },
                        label = { Text("Pickup Godown / Warehouse", fontSize = 11.sp) },
                        leadingIcon = { Icon(Icons.Default.Warehouse, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(18.dp)) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = Color(0xFF10B981),
                            unfocusedBorderColor = Color(0xFF334155)
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Delivery Customer Location
                    OutlinedTextField(
                        value = selectedDelivery,
                        onValueChange = { selectedDelivery = it },
                        label = { Text("Delivery Destination", fontSize = 11.sp) },
                        leadingIcon = { Icon(Icons.Default.Place, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(18.dp)) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = Color(0xFF10B981),
                            unfocusedBorderColor = Color(0xFF334155)
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Cargo description
                    OutlinedTextField(
                        value = cargoDescription,
                        onValueChange = { cargoDescription = it },
                        label = { Text("Cargo / Consignment Details", fontSize = 11.sp) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = Color(0xFF10B981),
                            unfocusedBorderColor = Color(0xFF334155)
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = quantityText,
                            onValueChange = { quantityText = it },
                            label = { Text("Quantity", fontSize = 10.sp) },
                            colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Color.White, unfocusedTextColor = Color.White),
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = weightText,
                            onValueChange = { weightText = it },
                            label = { Text("Weight (kg)", fontSize = 10.sp) },
                            colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Color.White, unfocusedTextColor = Color.White),
                            modifier = Modifier.weight(1f)
                        )
                    }

                    // Dispatch Allocation Strategy
                    Text("Driver Allocation:", fontSize = 11.sp, color = Color(0xFF94A3B8), fontWeight = FontWeight.Bold)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = { assignMode = "AUTO" },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (assignMode == "AUTO") Color(0xFF10B981) else Color(0xFF334155)
                            ),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("⚡ AI Auto-Dispatch", fontSize = 10.sp)
                        }
                        Button(
                            onClick = { assignMode = "MANUAL" },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (assignMode == "MANUAL") Color(0xFF10B981) else Color(0xFF334155)
                            ),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("👤 Driver 1 Assign", fontSize = 10.sp)
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val newJobNum = "JOB #${(10046..10099).random()}"
                        val targetDriver = if (assignMode == "AUTO") "Auto-Ranked Nearest Driver" else "Kiran Kumar (KA-04-AB-1234)"
                        val createdJob = UiJobItem(
                            id = System.currentTimeMillis().toString(),
                            jobNumber = newJobNum,
                            status = "OFFERED",
                            pickupName = selectedPickup,
                            deliveryName = selectedDelivery,
                            cargoDetails = "$cargoDescription ($weightText kg)",
                            assignedDriver = targetDriver,
                            priority = priorityText,
                            timeAgo = "Just now"
                        )
                        jobsList = listOf(createdJob) + jobsList
                        successMessage = "Success! $newJobNum created & dispatched with push notification."
                        showAddJobModal = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                ) {
                    Text("Confirm & Dispatch", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddJobModal = false }) {
                    Text("Cancel", color = Color(0xFF94A3B8))
                }
            },
            containerColor = Color(0xFF1E293B)
        )
    }
}
