package com.fleet.delivery.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fleet.delivery.util.FleetNotificationManager
import java.text.SimpleDateFormat
import java.util.*

data class UiJobItem(
    val id: String,
    val jobNumber: String,
    val status: String, // "AWAITING_ASSIGNMENT", "OFFERED", "ACCEPTED", "IN PROGRESS", "REJECTED", "COMPLETED"
    val pickupName: String,
    val deliveryName: String,
    val cargoDetails: String,
    val assignedDriver: String,
    val priority: String,
    val timeAgo: String,
    val rejectionReason: String? = null,
    val pickupLat: Double = 13.0285,
    val pickupLng: Double = 77.5195
)

data class UiVehicleItem(
    val id: String,
    val regNumber: String,
    val model: String,
    val type: String,
    val capacityKg: String,
    val status: String
)

data class UiStaffMember(
    val id: String,
    val name: String,
    val email: String,
    val phone: String,
    val role: String, // "GODOWN_MANAGER" or "SALES_STAFF"
    val assignedUnit: String
)

data class UiGodownLocation(
    val id: String,
    val name: String,
    val type: String,
    val address: String,
    val latitude: Double,
    val longitude: Double,
    val radiusMeters: Int
)

data class UiDriverRadarItem(
    val id: String,
    val name: String,
    val phone: String,
    val dutyStatus: String, // "AVAILABLE", "BUSY", "OFF_DUTY"
    val isBusy: Boolean,
    val activeOrder: String? = null,
    val distanceKm: Double,
    val vehicleName: String,
    val vehicleReg: String,
    val keepAliveStatus: String, // "ACTIVE", "IDLE", "OFFLINE"
    val lastPingSecondsAgo: Int,
    val latitude: Double,
    val longitude: Double,
    val speedKmh: Int
)

data class UiDriverDailyMetric(
    val driverId: String,
    val driverName: String,
    val phone: String,
    val dailyRanKm: Double,
    val vehiclesUsed: String,
    val dwellTimeMins: Int,
    val visitedLocations: List<String>,
    val keepAliveStatus: String
)

fun calculateHaversineKm(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
    val r = 6371.0 // Earth radius in km
    val dLat = Math.toRadians(lat2 - lat1)
    val dLon = Math.toRadians(lon2 - lon1)
    val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
    val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return Math.round(r * c * 10.0) / 10.0
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StaffOperationsScreen(
    userName: String,
    userRole: String, // "ADMIN", "GODOWN_MANAGER", "SALES_STAFF"
    userEmail: String,
    onLogoutClick: () -> Unit
) {
    val context = LocalContext.current
    var showLogoutDialog by remember { mutableStateOf(false) }
    var showAddJobModal by remember { mutableStateOf(false) }

    // Admin Management Modals
    var showDriversModal by remember { mutableStateOf(false) }
    var showAddDriverModal by remember { mutableStateOf(false) }
    var showVehiclesModal by remember { mutableStateOf(false) }
    var showAddVehicleModal by remember { mutableStateOf(false) }
    var showStaffModal by remember { mutableStateOf(false) }
    var showAddStaffModal by remember { mutableStateOf(false) }
    var showGodownsModal by remember { mutableStateOf(false) }
    var showAddGodownModal by remember { mutableStateOf(false) }

    // Operational Radar & Management Modals
    var jobToAllocateDriver by remember { mutableStateOf<UiJobItem?>(null) }
    var showLiveFleetModal by remember { mutableStateOf(false) }
    var showDailyMetricsModal by remember { mutableStateOf(false) }
    var jobToRejectWithRemark by remember { mutableStateOf<UiJobItem?>(null) }
    var customRejectRemark by remember { mutableStateOf("Vehicle capacity constraint: payload exceeds capacity") }
    var lastGpsRefreshTimestamp by remember { mutableStateOf("Live GPS Synced Just Now") }

    // State for delete confirmations
    var itemToDeleteType by remember { mutableStateOf<String?>(null) }
    var itemToDeleteId by remember { mutableStateOf<String?>(null) }
    var itemToDeleteName by remember { mutableStateOf<String?>(null) }

    // Staff tab selection in staff modal
    var staffModalTab by remember { mutableStateOf("GODOWN_MANAGER") }

    // Job Creation Form State
    var selectedPickup by remember { mutableStateOf("Peenya Central Godown") }
    var selectedPickupLat by remember { mutableStateOf(13.0285) }
    var selectedPickupLng by remember { mutableStateOf(77.5195) }
    var selectedDelivery by remember { mutableStateOf("Metro Hypermarket Malleshwaram") }
    var showPickupPicker by remember { mutableStateOf(false) }
    var showDeliveryPicker by remember { mutableStateOf(false) }
    var customDeliveryInput by remember { mutableStateOf("") }
    var isCustomDeliveryMode by remember { mutableStateOf(false) }
    var cargoDescription by remember { mutableStateOf("FMCG Consignment (40 Cases)") }
    var quantityText by remember { mutableStateOf("40") }
    var weightText by remember { mutableStateOf("250") }
    var priorityText by remember { mutableStateOf("High Priority") }

    // Add Driver Form State (Admin)
    var newDriverName by remember { mutableStateOf("") }
    var newDriverPhone by remember { mutableStateOf("") }
    var newDriverLicense by remember { mutableStateOf("") }
    var newDriverVehicle by remember { mutableStateOf("KA-04-AB-1234 (Tata Ace Gold)") }
    var newDriverDutyStatus by remember { mutableStateOf("AVAILABLE") }

    // Add Vehicle Form State
    var newVehicleReg by remember { mutableStateOf("") }
    var newVehicleModel by remember { mutableStateOf("Tata Ace Gold") }
    var newVehicleType by remember { mutableStateOf("SMALL_VAN") }
    var newVehiclePayload by remember { mutableStateOf("750") }

    // Add Staff Form State
    var newStaffName by remember { mutableStateOf("") }
    var newStaffEmail by remember { mutableStateOf("") }
    var newStaffPhone by remember { mutableStateOf("") }
    var newStaffRole by remember { mutableStateOf("GODOWN_MANAGER") }
    var newStaffUnit by remember { mutableStateOf("Peenya Central Godown") }

    // Add Godown Form State with Google Maps coordinates
    var newGodownName by remember { mutableStateOf("") }
    var newGodownType by remember { mutableStateOf("GODOWN") }
    var newGodownAddress by remember { mutableStateOf("") }
    var newGodownLat by remember { mutableStateOf("13.0285") }
    var newGodownLng by remember { mutableStateOf("77.5195") }
    var newGodownRadius by remember { mutableStateOf("150") }

    var successMessage by remember { mutableStateOf<String?>(null) }

    // Dynamic Lists
    var vehiclesList by remember {
        mutableStateOf(
            listOf(
                UiVehicleItem("v1", "KA-04-AB-1234", "Tata Ace Gold", "SMALL_VAN", "750 kg", "AVAILABLE"),
                UiVehicleItem("v2", "KA-05-CD-5678", "Eicher Pro 1049", "MEDIUM_TRUCK", "2500 kg", "IN_TRIP"),
                UiVehicleItem("v3", "KA-51-EF-9012", "Mahindra Bolero Maxi", "PICKUP", "1200 kg", "AVAILABLE"),
                UiVehicleItem("v4", "KA-03-GH-3456", "Piaggio Ape Electric", "EV_3W", "500 kg", "AVAILABLE"),
                UiVehicleItem("v5", "KA-01-IJ-7890", "Tata 407 LPT", "MEDIUM_TRUCK", "3500 kg", "MAINTENANCE")
            )
        )
    }

    var staffList by remember {
        mutableStateOf(
            listOf(
                UiStaffMember("s1", "Rajesh Sharma", "godown@fleetplatform.com", "+91 98450 12345", "GODOWN_MANAGER", "Peenya Central Godown"),
                UiStaffMember("s2", "Suresh Gowda", "suresh.gm@fleetplatform.com", "+91 98450 67890", "GODOWN_MANAGER", "Whitefield Depot"),
                UiStaffMember("s3", "Priya Sundaram", "sales@fleetplatform.com", "+91 98450 11223", "SALES_STAFF", "North Bangalore Commercial"),
                UiStaffMember("s4", "Arun Varma", "arun.sales@fleetplatform.com", "+91 98450 44556", "SALES_STAFF", "South IT Corridor")
            )
        )
    }

    var godownsList by remember {
        mutableStateOf(
            listOf(
                UiGodownLocation("g1", "Peenya Central Godown", "GODOWN", "Plot 45, Peenya 1st Stage, Bangalore", 13.0285, 77.5195, 150),
                UiGodownLocation("g2", "Whitefield Depot", "GODOWN", "Plot 12, ITPL Main Road, Bangalore", 12.9698, 77.7500, 200),
                UiGodownLocation("g3", "Electronic City Warehouse", "GODOWN", "Phase 2, Hosur Road, Bangalore", 12.8452, 77.6602, 175),
                UiGodownLocation("g4", "Yeshwanthpur Rail Terminal", "GODOWN", "Goods Yard Rd, Yeshwanthpur", 13.0224, 77.5503, 250),
                UiGodownLocation("g5", "Nelamangala Highway Hub", "GODOWN", "NH 48 Logistics Park, Nelamangala", 13.0968, 77.3876, 300)
            )
        )
    }

    var driversRadarList by remember {
        mutableStateOf(
            listOf(
                UiDriverRadarItem(
                    id = "d1",
                    name = "Kiran Kumar",
                    phone = "+91 98450 11001",
                    dutyStatus = "AVAILABLE",
                    isBusy = false,
                    distanceKm = 1.2,
                    vehicleName = "Tata Ace Gold (Mini Truck)",
                    vehicleReg = "KA-04-AB-1234",
                    keepAliveStatus = "ACTIVE",
                    lastPingSecondsAgo = 4,
                    latitude = 13.0285,
                    longitude = 77.5195,
                    speedKmh = 0
                ),
                UiDriverRadarItem(
                    id = "d2",
                    name = "Ramesh Babu",
                    phone = "+91 98450 11002",
                    dutyStatus = "BUSY",
                    isBusy = true,
                    activeOrder = "Order #10045 (In Transit)",
                    distanceKm = 3.8,
                    vehicleName = "Eicher Pro 1049 (Medium Truck)",
                    vehicleReg = "KA-05-CD-5678",
                    keepAliveStatus = "ACTIVE",
                    lastPingSecondsAgo = 12,
                    latitude = 12.9698,
                    longitude = 77.7500,
                    speedKmh = 28
                ),
                UiDriverRadarItem(
                    id = "d3",
                    name = "Sunil V",
                    phone = "+91 98450 11003",
                    dutyStatus = "AVAILABLE",
                    isBusy = false,
                    distanceKm = 4.6,
                    vehicleName = "Mahindra Bolero Maxi",
                    vehicleReg = "KA-51-EF-9012",
                    keepAliveStatus = "ACTIVE",
                    lastPingSecondsAgo = 25,
                    latitude = 12.8452,
                    longitude = 77.6602,
                    speedKmh = 0
                ),
                UiDriverRadarItem(
                    id = "d4",
                    name = "Anand Rao",
                    phone = "+91 98450 11004",
                    dutyStatus = "OFF_DUTY",
                    isBusy = false,
                    distanceKm = 8.2,
                    vehicleName = "Piaggio Ape Electric",
                    vehicleReg = "KA-03-GH-3456",
                    keepAliveStatus = "OFFLINE",
                    lastPingSecondsAgo = 3600,
                    latitude = 13.0300,
                    longitude = 77.5500,
                    speedKmh = 0
                )
            )
        )
    }

    var jobsList by remember {
        mutableStateOf(
            listOf(
                UiJobItem(
                    id = "0",
                    jobNumber = "JOB #10046",
                    status = "AWAITING_ASSIGNMENT",
                    pickupName = "Peenya Central Godown",
                    deliveryName = "Metro Hypermarket Malleshwaram",
                    cargoDetails = "40 Cases FMCG Goods (250 kg)",
                    assignedDriver = "Unassigned",
                    priority = "High",
                    timeAgo = "Just now",
                    rejectionReason = null,
                    pickupLat = 13.0285,
                    pickupLng = 77.5195
                ),
                UiJobItem(
                    id = "1",
                    jobNumber = "JOB #10045",
                    status = "IN PROGRESS",
                    pickupName = "Peenya Central Godown",
                    deliveryName = "Metro Hypermarket Malleshwaram",
                    cargoDetails = "50 Cartons Packaged Foods (350 kg)",
                    assignedDriver = "Kiran Kumar (KA-04-AB-1234)",
                    priority = "High",
                    timeAgo = "12 mins ago",
                    rejectionReason = null,
                    pickupLat = 13.0285,
                    pickupLng = 77.5195
                ),
                UiJobItem(
                    id = "2",
                    jobNumber = "JOB #10044",
                    status = "REJECTED",
                    pickupName = "Whitefield Depot",
                    deliveryName = "Indiranagar Retail Outlet",
                    cargoDetails = "20 Barrels Lubricant (200 kg)",
                    assignedDriver = "Ramesh Babu",
                    priority = "Normal",
                    timeAgo = "25 mins ago",
                    rejectionReason = "Vehicle capacity: flat tire - unable to take cargo load",
                    pickupLat = 12.9698,
                    pickupLng = 77.7500
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
                    timeAgo = "1 hour ago",
                    rejectionReason = null,
                    pickupLat = 12.8452,
                    pickupLng = 77.6602
                )
            )
        )
    }

    val dailyMetrics = listOf(
        UiDriverDailyMetric(
            driverId = "d1",
            driverName = "Kiran Kumar",
            phone = "+91 98450 11001",
            dailyRanKm = 48.5,
            vehiclesUsed = "KA-04-AB-1234 (Tata Ace Gold)",
            dwellTimeMins = 57,
            visitedLocations = listOf("Peenya Central Godown (32m)", "Metro Hypermarket Malleshwaram (25m)"),
            keepAliveStatus = "ACTIVE"
        ),
        UiDriverDailyMetric(
            driverId = "d2",
            driverName = "Ramesh Babu",
            phone = "+91 98450 11002",
            dailyRanKm = 62.0,
            vehiclesUsed = "KA-05-CD-5678 (Eicher Pro 1049)",
            dwellTimeMins = 78,
            visitedLocations = listOf("Whitefield Depot (40m)", "Indiranagar Retail Outlet (38m)"),
            keepAliveStatus = "ACTIVE"
        ),
        UiDriverDailyMetric(
            driverId = "d3",
            driverName = "Sunil V",
            phone = "+91 98450 11003",
            dailyRanKm = 35.2,
            vehiclesUsed = "KA-51-EF-9012 (Mahindra Bolero Maxi)",
            dwellTimeMins = 45,
            visitedLocations = listOf("Electronic City Warehouse (25m)", "Koramangala Logistics Bay (20m)"),
            keepAliveStatus = "ACTIVE"
        )
    )

    val roleLabel = when (userRole) {
        "ADMIN" -> "SUPER ADMINISTRATOR"
        "GODOWN_MANAGER" -> "GODOWN OPERATIONS MANAGER"
        "SALES_STAFF" -> "SALES & DISPATCH DESK"
        else -> userRole
    }

    val roleColor = when (userRole) {
        "ADMIN" -> Color(0xFF10B981)
        "GODOWN_MANAGER" -> Color(0xFFF59E0B)
        "SALES_STAFF" -> Color(0xFF38BDF8)
        else -> Color(0xFF94A3B8)
    }

    // LOGOUT CONFIRMATION DIALOG
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

    // ITEM DELETE CONFIRMATION DIALOG
    if (itemToDeleteId != null) {
        AlertDialog(
            onDismissRequest = {
                itemToDeleteId = null
                itemToDeleteName = null
                itemToDeleteType = null
            },
            title = { Text("Delete ${itemToDeleteType ?: "Item"}?", fontWeight = FontWeight.Bold, color = Color(0xFFEF4444)) },
            text = { Text("Are you sure you want to delete '${itemToDeleteName ?: ""}'? This action cannot be undone.") },
            confirmButton = {
                Button(
                    onClick = {
                        when (itemToDeleteType) {
                            "Vehicle" -> {
                                vehiclesList = vehiclesList.filter { it.id != itemToDeleteId }
                                successMessage = "Vehicle deleted successfully."
                            }
                            "Staff" -> {
                                staffList = staffList.filter { it.id != itemToDeleteId }
                                successMessage = "Staff member removed successfully."
                            }
                            "Warehouse" -> {
                                godownsList = godownsList.filter { it.id != itemToDeleteId }
                                successMessage = "Warehouse / Godown deleted successfully."
                            }
                            "Driver" -> {
                                driversRadarList = driversRadarList.filter { it.id != itemToDeleteId }
                                successMessage = "Driver removed successfully from fleet roster."
                            }
                        }
                        itemToDeleteId = null
                        itemToDeleteName = null
                        itemToDeleteType = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                TextButton(onClick = {
                    itemToDeleteId = null
                    itemToDeleteName = null
                    itemToDeleteType = null
                }) {
                    Text("Cancel")
                }
            },
            containerColor = Color(0xFF1E293B),
            titleContentColor = Color.White,
            textContentColor = Color(0xFFCBD5E1)
        )
    }

    // =========================================================================
    // MODAL: GODOWN MANAGER DRIVER ALLOCATION & LIVE RADAR (CLOSEST & BUSY DISTANCE)
    // =========================================================================
    if (jobToAllocateDriver != null) {
        val job = jobToAllocateDriver!!
        AlertDialog(
            onDismissRequest = { jobToAllocateDriver = null },
            title = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Allocate Driver: ${job.jobNumber}", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Text("Pickup: ${job.pickupName}", color = Color(0xFF10B981), fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    }
                    IconButton(onClick = { jobToAllocateDriver = null }) {
                        Icon(Icons.Default.Close, contentDescription = null, tint = Color(0xFF94A3B8))
                    }
                }
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 440.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Location & Refresh bar
                    Surface(
                        color = Color(0xFF0F172A),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("📍 Lat: ${job.pickupLat}, Lng: ${job.pickupLng}", color = Color(0xFF94A3B8), fontSize = 10.sp, fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace)
                                Text(lastGpsRefreshTimestamp, color = Color(0xFF38BDF8), fontSize = 10.sp)
                            }
                            Button(
                                onClick = {
                                    val nowTime = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
                                    lastGpsRefreshTimestamp = "Refreshed at $nowTime (GPS Synced)"
                                    // Simulated location refresh with distance perturbation
                                    driversRadarList = driversRadarList.map { d ->
                                        if (d.id == "d1") d.copy(lastPingSecondsAgo = 1, latitude = d.latitude + 0.0003)
                                        else if (d.id == "d2") d.copy(lastPingSecondsAgo = 2, latitude = d.latitude - 0.0002)
                                        else d
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                                shape = RoundedCornerShape(6.dp),
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Refresh GPS", fontSize = 10.sp)
                            }
                        }
                    }

                    // Dynamic driver distances from selected job pickup warehouse
                    val driversWithCalculatedDist = remember(job, driversRadarList) {
                        driversRadarList.map { drv ->
                            val dist = calculateHaversineKm(job.pickupLat, job.pickupLng, drv.latitude, drv.longitude)
                            drv.copy(distanceKm = dist)
                        }
                    }
                    val closestAvailableDriverId = remember(driversWithCalculatedDist) {
                        driversWithCalculatedDist
                            .filter { !it.isBusy && it.dutyStatus == "AVAILABLE" }
                            .minByOrNull { it.distanceKm }?.id
                    }

                    Text("Active Fleet Drivers in Operational Radius (${job.pickupName}):", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)

                    // Driver Cards
                    driversWithCalculatedDist.forEach { drv ->
                        val isClosest = drv.id == closestAvailableDriverId
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = if (isClosest) Color(0xFF064E3B) else if (drv.isBusy) Color(0xFF2E1065) else Color(0xFF1E293B)
                            ),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(
                                    width = if (isClosest) 1.5.dp else 1.dp,
                                    color = if (isClosest) Color(0xFF10B981) else if (drv.isBusy) Color(0xFF9333EA) else Color(0xFF334155),
                                    shape = RoundedCornerShape(10.dp)
                                )
                        ) {
                            Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(drv.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                        Text("${drv.vehicleName} • ${drv.vehicleReg}", color = Color(0xFF94A3B8), fontSize = 11.sp)
                                    }

                                    if (isClosest) {
                                        Surface(
                                            color = Color(0xFF10B981),
                                            shape = RoundedCornerShape(4.dp)
                                        ) {
                                            Text("⭐ CLOSEST", color = Color(0xFF064E3B), fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp))
                                        }
                                    }
                                }

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    if (drv.isBusy) {
                                        // SHOW AS BUSY AND SHOW DISTANCE FROM ASSIGNED LOCATION
                                        Column {
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Surface(color = Color(0xFFDC2626).copy(alpha = 0.2f), shape = RoundedCornerShape(4.dp)) {
                                                    Text("🟡 BUSY: ${drv.activeOrder ?: "On Order"}", color = Color(0xFFFCA5A5), fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp))
                                                }
                                            }
                                            Text(
                                                "📍 Distance from Pickup: ${drv.distanceKm} km",
                                                color = Color(0xFFFBBF24),
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    } else {
                                        Column {
                                            Text("🟢 ${drv.dutyStatus}", color = Color(0xFF10B981), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                            Text("📍 Distance from Pickup: ${drv.distanceKm} km", color = Color(0xFF38BDF8), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }

                                    // ASSIGN BUTTON
                                    Button(
                                        onClick = {
                                            // Assign driver to job
                                            jobsList = jobsList.map { j ->
                                                if (j.id == job.id) {
                                                    j.copy(
                                                        status = "OFFERED",
                                                        assignedDriver = "${drv.name} (${drv.vehicleReg})",
                                                        rejectionReason = null,
                                                        timeAgo = "Offered just now"
                                                    )
                                                } else j
                                            }
                                            FleetNotificationManager.showOperationalAlert(
                                                context,
                                                "JOB_ASSIGNED",
                                                "Job Offered: ${job.jobNumber}",
                                                "Task offered to ${drv.name} (${drv.vehicleReg}). Awaiting acceptance."
                                            )
                                            successMessage = "Assigned to ${drv.name}! Push notification sent to driver's phone."
                                            jobToAllocateDriver = null
                                        },
                                        enabled = !drv.isBusy && drv.dutyStatus == "AVAILABLE",
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = if (isClosest) Color(0xFF10B981) else Color(0xFF0284C7),
                                            disabledContainerColor = Color(0xFF334155)
                                        ),
                                        shape = RoundedCornerShape(8.dp),
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                                    ) {
                                        Text(
                                            if (isClosest) "⚡ Assign Closest" else if (drv.isBusy) "Busy" else "Assign",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { jobToAllocateDriver = null }) {
                    Text("Close", color = Color(0xFF94A3B8))
                }
            },
            containerColor = Color(0xFF1E293B),
            titleContentColor = Color.White,
            textContentColor = Color(0xFFCBD5E1)
        )
    }

    // =========================================================================
    // MODAL: SIMULATE DRIVER REJECT WITH AUDIT REMARK (FOR TESTING PAIRING FLOW)
    // =========================================================================
    if (jobToRejectWithRemark != null) {
        val job = jobToRejectWithRemark!!
        AlertDialog(
            onDismissRequest = { jobToRejectWithRemark = null },
            title = {
                Text("Simulate Driver Reject: ${job.jobNumber}", fontWeight = FontWeight.Bold, color = Color(0xFFEF4444), fontSize = 15.sp)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Enter driver rejection remark (e.g. flat tire, vehicle overloaded):", fontSize = 11.sp, color = Color(0xFF94A3B8))
                    OutlinedTextField(
                        value = customRejectRemark,
                        onValueChange = { customRejectRemark = it },
                        label = { Text("Driver Rejection Remark") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val remark = if (customRejectRemark.isNotBlank()) customRejectRemark.trim() else "Vehicle issue"
                        jobsList = jobsList.map { j ->
                            if (j.id == job.id) {
                                j.copy(
                                    status = "REJECTED",
                                    rejectionReason = remark,
                                    timeAgo = "Rejected just now"
                                )
                            } else j
                        }
                        FleetNotificationManager.showOperationalAlert(
                            context,
                            "JOB_REJECTED",
                            "⚠️ Job Rejected: ${job.jobNumber}",
                            "Driver rejected task with remark: '$remark'. Re-assignment required."
                        )
                        successMessage = "Job marked as Rejected with remark. Godown Manager alerted to reassign."
                        jobToRejectWithRemark = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                ) {
                    Text("Confirm Rejection")
                }
            },
            dismissButton = {
                TextButton(onClick = { jobToRejectWithRemark = null }) {
                    Text("Cancel", color = Color(0xFF94A3B8))
                }
            },
            containerColor = Color(0xFF1E293B),
            titleContentColor = Color.White,
            textContentColor = Color(0xFFCBD5E1)
        )
    }

    // =========================================================================
    // MODAL: LIVE KEEP-ALIVE FLEET RADAR (VISIBLE TO ADMIN & SALES STAFF)
    // =========================================================================
    if (showLiveFleetModal) {
        AlertDialog(
            onDismissRequest = { showLiveFleetModal = false },
            title = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Radio, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Live Keep-Alive & Geo Fleet Tracking", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                    IconButton(onClick = { showLiveFleetModal = false }) {
                        Icon(Icons.Default.Close, contentDescription = null, tint = Color(0xFF94A3B8))
                    }
                }
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 420.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text("Real-Time Driver Foreground Heartbeat & GPS Coordinates:", color = Color(0xFF94A3B8), fontSize = 11.sp)

                    driversRadarList.forEach { drv ->
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(drv.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                    Surface(
                                        color = if (drv.keepAliveStatus == "ACTIVE") Color(0xFF064E3B) else Color(0xFF1E293B),
                                        shape = RoundedCornerShape(4.dp)
                                    ) {
                                        Text(
                                            "🟢 ${drv.keepAliveStatus} (${drv.lastPingSecondsAgo}s ago)",
                                            color = if (drv.keepAliveStatus == "ACTIVE") Color(0xFF6EE7B7) else Color(0xFF94A3B8),
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }
                                }

                                Text("Vehicle: ${drv.vehicleReg} (${drv.vehicleName})", color = Color(0xFF38BDF8), fontSize = 11.sp)
                                Text("📍 Lat: ${drv.latitude}, Lng: ${drv.longitude} • Speed: ${drv.speedKmh} km/h", color = Color(0xFF10B981), fontSize = 10.sp, fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace)

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.End
                                ) {
                                    TextButton(
                                        onClick = {
                                            val uri = Uri.parse("https://www.google.com/maps?q=${drv.latitude},${drv.longitude}")
                                            context.startActivity(Intent(Intent.ACTION_VIEW, uri))
                                        },
                                        contentPadding = PaddingValues(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        Icon(Icons.Default.Navigation, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(13.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Open in Google Maps", color = Color(0xFF38BDF8), fontSize = 10.sp)
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showLiveFleetModal = false }) {
                    Text("Close", color = Color(0xFF94A3B8))
                }
            },
            containerColor = Color(0xFF1E293B),
            titleContentColor = Color.White,
            textContentColor = Color(0xFFCBD5E1)
        )
    }

    // =========================================================================
    // MODAL: ADMIN DAILY DRIVER RUN, VEHICLES USED & DISPATCH DWELL TIMES
    // =========================================================================
    if (showDailyMetricsModal) {
        AlertDialog(
            onDismissRequest = { showDailyMetricsModal = false },
            title = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Drivers Daily Performance", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Daily Ran KM, Vehicles & Dispatch Dwell Time", color = Color(0xFF10B981), fontSize = 10.sp)
                    }
                    IconButton(onClick = { showDailyMetricsModal = false }) {
                        Icon(Icons.Default.Close, contentDescription = null, tint = Color(0xFF94A3B8))
                    }
                }
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 440.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    dailyMetrics.forEach { m ->
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(m.driverName, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                    Surface(color = Color(0xFF064E3B), shape = RoundedCornerShape(4.dp)) {
                                        Text("🟢 ${m.keepAliveStatus}", color = Color(0xFF6EE7B7), fontSize = 9.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp))
                                    }
                                }

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Daily Ran Distance:", color = Color(0xFF94A3B8), fontSize = 11.sp)
                                    Text("${m.dailyRanKm} km", color = Color(0xFF10B981), fontSize = 12.sp, fontWeight = FontWeight.ExtraBold)
                                }

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Vehicles Used:", color = Color(0xFF94A3B8), fontSize = 11.sp)
                                    Text(m.vehiclesUsed, color = Color(0xFF38BDF8), fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                                }

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Dispatch Dwell Time:", color = Color(0xFF94A3B8), fontSize = 11.sp)
                                    Text("${m.dwellTimeMins} mins total", color = Color(0xFFFBBF24), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }

                                Text("Dispatch Locations Visited:", color = Color(0xFF64748B), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                m.visitedLocations.forEach { loc ->
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Place, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(12.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text(loc, color = Color(0xFFCBD5E1), fontSize = 10.sp)
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showDailyMetricsModal = false }) {
                    Text("Close", color = Color(0xFF94A3B8))
                }
            },
            containerColor = Color(0xFF1E293B),
            titleContentColor = Color.White,
            textContentColor = Color(0xFFCBD5E1)
        )
    }

    // ==========================================
    // MODAL: MANAGE FLEET DRIVERS (ADMIN)
    // ==========================================
    if (showDriversModal) {
        AlertDialog(
            onDismissRequest = { showDriversModal = false },
            title = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Fleet Drivers (${driversRadarList.size})", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Button(
                        onClick = { showAddDriverModal = true },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(Icons.Default.PersonAdd, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("+ Add Driver", fontSize = 12.sp)
                    }
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
                    driversRadarList.forEach { d ->
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(d.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Surface(
                                            color = when (d.dutyStatus) {
                                                "AVAILABLE" -> Color(0xFF10B981).copy(alpha = 0.2f)
                                                "BUSY" -> Color(0xFFF59E0B).copy(alpha = 0.2f)
                                                else -> Color(0xFF64748B).copy(alpha = 0.2f)
                                            },
                                            shape = RoundedCornerShape(4.dp)
                                        ) {
                                            Text(
                                                text = d.dutyStatus,
                                                color = when (d.dutyStatus) {
                                                    "AVAILABLE" -> Color(0xFF34D399)
                                                    "BUSY" -> Color(0xFFFBBF24)
                                                    else -> Color(0xFF94A3B8)
                                                },
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                                            )
                                        }
                                    }
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text("📞 ${d.phone} • 🚛 ${d.vehicleName} (${d.vehicleReg})", color = Color(0xFF94A3B8), fontSize = 10.sp)
                                    Text(
                                        "📡 Keep-Alive: ${d.keepAliveStatus} • Lat: ${d.latitude}, Lng: ${d.longitude}",
                                        color = if (d.keepAliveStatus == "ACTIVE") Color(0xFF38BDF8) else Color(0xFF64748B),
                                        fontSize = 9.sp
                                    )
                                }
                                if (userRole == "ADMIN") {
                                    IconButton(
                                        onClick = {
                                            itemToDeleteType = "Driver"
                                            itemToDeleteId = d.id
                                            itemToDeleteName = d.name
                                        }
                                    ) {
                                        Icon(Icons.Default.Delete, contentDescription = "Delete Driver", tint = Color(0xFFEF4444), modifier = Modifier.size(20.dp))
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showDriversModal = false }) {
                    Text("Close", color = Color(0xFF94A3B8))
                }
            },
            containerColor = Color(0xFF1E293B),
            titleContentColor = Color.White,
            textContentColor = Color(0xFFCBD5E1)
        )
    }

    // MODAL: ADD DRIVER FORM
    if (showAddDriverModal) {
        AlertDialog(
            onDismissRequest = { showAddDriverModal = false },
            title = { Text("+ Add Fleet Driver", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 420.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedTextField(
                        value = newDriverName,
                        onValueChange = { newDriverName = it },
                        label = { Text("Full Name (e.g. Ramesh Kumar)") },
                        placeholder = { Text("Human name only (no roles or IDs)", color = Color(0xFF64748B), fontSize = 11.sp) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = newDriverPhone,
                        onValueChange = { newDriverPhone = it },
                        label = { Text("Phone Number (+91 ...)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = newDriverLicense,
                        onValueChange = { newDriverLicense = it },
                        label = { Text("Driver License (e.g. KA-04-2024-00123)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Vehicle assignment
                    Text("Assigned Vehicle:", color = Color(0xFF94A3B8), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        vehiclesList.forEach { v ->
                            val vLabel = "${v.regNumber} (${v.model})"
                            val isSelected = newDriverVehicle == vLabel || newDriverVehicle.startsWith(v.regNumber)
                            Surface(
                                color = if (isSelected) Color(0xFF10B981).copy(alpha = 0.2f) else Color(0xFF0F172A),
                                shape = RoundedCornerShape(6.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .border(
                                        1.dp,
                                        if (isSelected) Color(0xFF10B981) else Color(0xFF334155),
                                        RoundedCornerShape(6.dp)
                                    )
                                    .clickable { newDriverVehicle = vLabel }
                            ) {
                                Row(
                                    modifier = Modifier.padding(8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    RadioButton(
                                        selected = isSelected,
                                        onClick = { newDriverVehicle = vLabel },
                                        colors = RadioButtonDefaults.colors(selectedColor = Color(0xFF10B981))
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(vLabel, color = Color.White, fontSize = 11.sp)
                                }
                            }
                        }
                    }

                    // Initial Duty Status
                    Text("Initial Duty Status:", color = Color(0xFF94A3B8), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        listOf("AVAILABLE", "OFF_DUTY").forEach { status ->
                            val isChosen = newDriverDutyStatus == status
                            Button(
                                onClick = { newDriverDutyStatus = status },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (isChosen) Color(0xFF10B981) else Color(0xFF0F172A)
                                ),
                                shape = RoundedCornerShape(6.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text(status, fontSize = 11.sp)
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newDriverName.isNotBlank()) {
                            val cleanName = newDriverName.trim()
                            val assignedReg = if (newDriverVehicle.contains(" ")) newDriverVehicle.substringBefore(" ").trim() else newDriverVehicle.trim()
                            val newDriver = UiDriverRadarItem(
                                id = "d_${System.currentTimeMillis()}",
                                name = cleanName,
                                phone = if (newDriverPhone.isNotBlank()) newDriverPhone.trim() else "+91 98450 ${10000 + (driversRadarList.size * 111)}",
                                dutyStatus = newDriverDutyStatus,
                                isBusy = (newDriverDutyStatus == "BUSY"),
                                activeOrder = null,
                                distanceKm = 1.5,
                                vehicleName = newDriverVehicle,
                                vehicleReg = assignedReg,
                                keepAliveStatus = if (newDriverDutyStatus == "AVAILABLE") "ACTIVE" else "OFFLINE",
                                lastPingSecondsAgo = 2,
                                latitude = 13.0285,
                                longitude = 77.5195,
                                speedKmh = 0
                            )
                            driversRadarList = listOf(newDriver) + driversRadarList
                            successMessage = "Driver ${newDriver.name} added successfully."
                            newDriverName = ""
                            newDriverPhone = ""
                            newDriverLicense = ""
                            showAddDriverModal = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                ) {
                    Text("Save Driver")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddDriverModal = false }) {
                    Text("Cancel")
                }
            },
            containerColor = Color(0xFF1E293B),
            titleContentColor = Color.White,
            textContentColor = Color(0xFFCBD5E1)
        )
    }

    // ==========================================
    // MODAL: MANAGE VEHICLES (Add & Delete)
    // ==========================================
    if (showVehiclesModal) {
        AlertDialog(
            onDismissRequest = { showVehiclesModal = false },
            title = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Vehicles Fleet (${vehiclesList.size})", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Button(
                        onClick = { showAddVehicleModal = true },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF38BDF8)),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("+ Add", fontSize = 12.sp)
                    }
                }
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 380.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    vehiclesList.forEach { v ->
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(v.regNumber, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                    Text("${v.model} • ${v.type}", color = Color(0xFF94A3B8), fontSize = 11.sp)
                                    Text("Capacity: ${v.capacityKg} • Status: ${v.status}", color = Color(0xFF10B981), fontSize = 10.sp)
                                }
                                IconButton(
                                    onClick = {
                                        itemToDeleteType = "Vehicle"
                                        itemToDeleteId = v.id
                                        itemToDeleteName = v.regNumber
                                    }
                                ) {
                                    Icon(Icons.Default.Delete, contentDescription = "Delete", tint = Color(0xFFEF4444), modifier = Modifier.size(20.dp))
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showVehiclesModal = false }) {
                    Text("Close", color = Color(0xFF94A3B8))
                }
            },
            containerColor = Color(0xFF1E293B),
            titleContentColor = Color.White,
            textContentColor = Color(0xFFCBD5E1)
        )
    }

    // MODAL: ADD VEHICLE FORM
    if (showAddVehicleModal) {
        AlertDialog(
            onDismissRequest = { showAddVehicleModal = false },
            title = { Text("+ Add Fleet Vehicle", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = {
                Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = newVehicleReg,
                        onValueChange = { newVehicleReg = it },
                        label = { Text("Registration Number (e.g. KA-04-XX-9999)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = newVehicleModel,
                        onValueChange = { newVehicleModel = it },
                        label = { Text("Vehicle Model (e.g. Tata Ace)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = newVehiclePayload,
                        onValueChange = { newVehiclePayload = it },
                        label = { Text("Payload Capacity (kg)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newVehicleReg.isNotBlank()) {
                            val newV = UiVehicleItem(
                                id = "v_${System.currentTimeMillis()}",
                                regNumber = newVehicleReg.trim().uppercase(),
                                model = newVehicleModel.trim(),
                                type = newVehicleType,
                                capacityKg = "${newVehiclePayload.trim()} kg",
                                status = "AVAILABLE"
                            )
                            vehiclesList = listOf(newV) + vehiclesList
                            successMessage = "Vehicle ${newV.regNumber} added successfully."
                            newVehicleReg = ""
                            showAddVehicleModal = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                ) {
                    Text("Save Vehicle")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddVehicleModal = false }) {
                    Text("Cancel")
                }
            },
            containerColor = Color(0xFF1E293B),
            titleContentColor = Color.White,
            textContentColor = Color(0xFFCBD5E1)
        )
    }

    // ==========================================
    // MODAL: MANAGE OPERATIONS STAFF (GM & Sales)
    // ==========================================
    if (showStaffModal) {
        val filteredStaff = staffList.filter { it.role == staffModalTab }
        AlertDialog(
            onDismissRequest = { showStaffModal = false },
            title = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Staff Management", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Button(
                        onClick = {
                            newStaffRole = staffModalTab
                            showAddStaffModal = true
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFA78BFA)),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(Icons.Default.PersonAdd, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("+ Add Staff", fontSize = 12.sp)
                    }
                }
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 400.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Staff Role Tabs
                    Row(modifier = Modifier.fillMaxWidth()) {
                        Button(
                            onClick = { staffModalTab = "GODOWN_MANAGER" },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (staffModalTab == "GODOWN_MANAGER") Color(0xFFF59E0B) else Color(0xFF0F172A)
                            ),
                            shape = RoundedCornerShape(topStart = 8.dp, bottomStart = 8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Godown Mgrs", fontSize = 11.sp)
                        }
                        Button(
                            onClick = { staffModalTab = "SALES_STAFF" },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (staffModalTab == "SALES_STAFF") Color(0xFF38BDF8) else Color(0xFF0F172A)
                            ),
                            shape = RoundedCornerShape(topEnd = 8.dp, bottomEnd = 8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Sales Staff", fontSize = 11.sp)
                        }
                    }

                    // Staff List
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f)
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        filteredStaff.forEach { s ->
                            Card(
                                colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(10.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(s.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                        Text(s.email, color = Color(0xFF94A3B8), fontSize = 11.sp)
                                        Text("📞 ${s.phone} • 📍 ${s.assignedUnit}", color = Color(0xFFCBD5E1), fontSize = 10.sp)
                                    }
                                    IconButton(
                                        onClick = {
                                            itemToDeleteType = "Staff"
                                            itemToDeleteId = s.id
                                            itemToDeleteName = s.name
                                        }
                                    ) {
                                        Icon(Icons.Default.Delete, contentDescription = "Delete", tint = Color(0xFFEF4444), modifier = Modifier.size(20.dp))
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showStaffModal = false }) {
                    Text("Close", color = Color(0xFF94A3B8))
                }
            },
            containerColor = Color(0xFF1E293B),
            titleContentColor = Color.White,
            textContentColor = Color(0xFFCBD5E1)
        )
    }

    // MODAL: ADD STAFF FORM
    if (showAddStaffModal) {
        AlertDialog(
            onDismissRequest = { showAddStaffModal = false },
            title = {
                Text(
                    if (newStaffRole == "GODOWN_MANAGER") "+ Add Godown Manager" else "+ Add Sales Representative",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            },
            text = {
                Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = newStaffName,
                        onValueChange = { newStaffName = it },
                        label = { Text("Full Name (e.g. Ramesh Sharma)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = newStaffEmail,
                        onValueChange = { newStaffEmail = it },
                        label = { Text("Email Address") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = newStaffPhone,
                        onValueChange = { newStaffPhone = it },
                        label = { Text("Phone Number (+91 ...)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = newStaffUnit,
                        onValueChange = { newStaffUnit = it },
                        label = { Text(if (newStaffRole == "GODOWN_MANAGER") "Assigned Godown" else "Sales Territory") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newStaffName.isNotBlank() && newStaffEmail.isNotBlank()) {
                            val newMember = UiStaffMember(
                                id = "s_${System.currentTimeMillis()}",
                                name = newStaffName.trim(),
                                email = newStaffEmail.trim(),
                                phone = if (newStaffPhone.isNotBlank()) newStaffPhone.trim() else "+91 98450 00000",
                                role = newStaffRole,
                                assignedUnit = newStaffUnit.trim()
                            )
                            staffList = listOf(newMember) + staffList
                            successMessage = "${newMember.name} added to ${newMember.role}."
                            newStaffName = ""
                            newStaffEmail = ""
                            newStaffPhone = ""
                            showAddStaffModal = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (newStaffRole == "GODOWN_MANAGER") Color(0xFFF59E0B) else Color(0xFF38BDF8)
                    )
                ) {
                    Text("Save Staff")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddStaffModal = false }) {
                    Text("Cancel")
                }
            },
            containerColor = Color(0xFF1E293B),
            titleContentColor = Color.White,
            textContentColor = Color(0xFFCBD5E1)
        )
    }

    // ==========================================
    // MODAL: MANAGE GODOWNS & WAREHOUSES
    // ==========================================
    if (showGodownsModal) {
        AlertDialog(
            onDismissRequest = { showGodownsModal = false },
            title = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Warehouses & Godowns (${godownsList.size})", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    Button(
                        onClick = { showAddGodownModal = true },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(Icons.Default.AddLocation, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("+ Add", fontSize = 12.sp)
                    }
                }
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 400.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    godownsList.forEach { g ->
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(g.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                        Text(g.address, color = Color(0xFF94A3B8), fontSize = 11.sp)
                                        Text(
                                            "📍 Lat: ${g.latitude}, Lng: ${g.longitude} • Geofence: ${g.radiusMeters}m",
                                            color = Color(0xFF10B981),
                                            fontSize = 10.sp
                                        )
                                    }
                                    if (userRole == "ADMIN") {
                                        IconButton(
                                            onClick = {
                                                itemToDeleteType = "Warehouse"
                                                itemToDeleteId = g.id
                                                itemToDeleteName = g.name
                                            }
                                        ) {
                                            Icon(Icons.Default.Delete, contentDescription = "Delete", tint = Color(0xFFEF4444), modifier = Modifier.size(20.dp))
                                        }
                                    }
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.End
                                ) {
                                    TextButton(
                                        onClick = {
                                            val webUri = Uri.parse("https://www.google.com/maps?q=${g.latitude},${g.longitude}")
                                            context.startActivity(Intent(Intent.ACTION_VIEW, webUri))
                                        },
                                        contentPadding = PaddingValues(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        Icon(Icons.Default.Map, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(14.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Open in Google Maps", color = Color(0xFF38BDF8), fontSize = 10.sp)
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showGodownsModal = false }) {
                    Text("Close", color = Color(0xFF94A3B8))
                }
            },
            containerColor = Color(0xFF1E293B),
            titleContentColor = Color.White,
            textContentColor = Color(0xFFCBD5E1)
        )
    }

    // MODAL: ADD GODOWN WITH GOOGLE MAPS COORDINATE SELECTION
    if (showAddGodownModal) {
        AlertDialog(
            onDismissRequest = { showAddGodownModal = false },
            title = {
                Text("+ Add Godown with Maps Coordinates", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 420.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedTextField(
                        value = newGodownName,
                        onValueChange = { newGodownName = it },
                        label = { Text("Godown / Warehouse Name") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = newGodownAddress,
                        onValueChange = { newGodownAddress = it },
                        label = { Text("Physical Address") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Quick Logistic Coordinate Presets
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(8.dp)) {
                            Text("Quick Google Maps Location Presets:", color = Color(0xFF94A3B8), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                Button(
                                    onClick = {
                                        newGodownLat = "13.0285"
                                        newGodownLng = "77.5195"
                                        if (newGodownName.isBlank()) newGodownName = "Peenya Depot #2"
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                                    contentPadding = PaddingValues(4.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text("Peenya", fontSize = 9.sp, color = Color(0xFF10B981))
                                }
                                Button(
                                    onClick = {
                                        newGodownLat = "12.9698"
                                        newGodownLng = "77.7500"
                                        if (newGodownName.isBlank()) newGodownName = "Whitefield Depot #2"
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                                    contentPadding = PaddingValues(4.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text("Whitefield", fontSize = 9.sp, color = Color(0xFF10B981))
                                }
                                Button(
                                    onClick = {
                                        newGodownLat = "12.8452"
                                        newGodownLng = "77.6602"
                                        if (newGodownName.isBlank()) newGodownName = "E-City Depot"
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                                    contentPadding = PaddingValues(4.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text("E-City", fontSize = 9.sp, color = Color(0xFF10B981))
                                }
                            }
                        }
                    }

                    // Latitude & Longitude Coordinate Inputs
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = newGodownLat,
                            onValueChange = { newGodownLat = it },
                            label = { Text("Latitude (Lat)") },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = newGodownLng,
                            onValueChange = { newGodownLng = it },
                            label = { Text("Longitude (Lng)") },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                    }

                    OutlinedTextField(
                        value = newGodownRadius,
                        onValueChange = { newGodownRadius = it },
                        label = { Text("Geofence Radius (meters)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Button(
                        onClick = {
                            val webUri = Uri.parse("https://www.google.com/maps?q=$newGodownLat,$newGodownLng")
                            context.startActivity(Intent(Intent.ACTION_VIEW, webUri))
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.OpenInBrowser, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Verify Pin on Google Maps", fontSize = 12.sp)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newGodownName.isNotBlank()) {
                            val newG = UiGodownLocation(
                                id = "g_${System.currentTimeMillis()}",
                                name = newGodownName.trim(),
                                type = newGodownType,
                                address = if (newGodownAddress.isNotBlank()) newGodownAddress.trim() else "Bengaluru Industrial Corridor",
                                latitude = newGodownLat.toDoubleOrNull() ?: 13.0285,
                                longitude = newGodownLng.toDoubleOrNull() ?: 77.5195,
                                radiusMeters = newGodownRadius.toIntOrNull() ?: 150
                            )
                            godownsList = listOf(newG) + godownsList
                            successMessage = "Warehouse '${newG.name}' saved with GPS coordinates."
                            newGodownName = ""
                            newGodownAddress = ""
                            showAddGodownModal = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                ) {
                    Text("Save Godown")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddGodownModal = false }) {
                    Text("Cancel")
                }
            },
            containerColor = Color(0xFF1E293B),
            titleContentColor = Color.White,
            textContentColor = Color(0xFFCBD5E1)
        )
    }

    // ==========================================
    // MODAL: ADD DELIVERY JOB (Admin & Sales Staff)
    // ==========================================
    if (showAddJobModal) {
        AlertDialog(
            onDismissRequest = { showAddJobModal = false },
            title = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Create Delivery Job", fontWeight = FontWeight.Bold, fontSize = 17.sp)
                    IconButton(onClick = { showAddJobModal = false }, modifier = Modifier.size(24.dp)) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = Color(0xFF94A3B8))
                    }
                }
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 420.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Pickup Godown (Interactive Selection)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Pickup Warehouse / Godown", color = Color(0xFF94A3B8), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text("Tap to Select", color = Color(0xFF10B981), fontSize = 10.sp, fontWeight = FontWeight.SemiBold)
                    }
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { showPickupPicker = true }
                            .border(1.dp, Color(0xFF10B981).copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                    ) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                Icon(Icons.Default.Warehouse, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Column {
                                    Text(selectedPickup, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                    Text(
                                        "📍 Lat: $selectedPickupLat, Lng: $selectedPickupLng",
                                        color = Color(0xFF10B981),
                                        fontSize = 10.sp,
                                        fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                                    )
                                }
                            }
                            Icon(Icons.Default.ArrowDropDown, contentDescription = "Select", tint = Color(0xFF10B981), modifier = Modifier.size(22.dp))
                        }
                    }

                    // Delivery Customer (Interactive Selection)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Delivery Destination", color = Color(0xFF94A3B8), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text("Tap to Select / Custom", color = Color(0xFF38BDF8), fontSize = 10.sp, fontWeight = FontWeight.SemiBold)
                    }
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { showDeliveryPicker = true }
                            .border(1.dp, Color(0xFF38BDF8).copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                    ) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Column {
                                    Text(selectedDelivery, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                    Text(if (isCustomDeliveryMode) "Custom Destination" else "Standard Retail / Inter-hub Destination", color = Color(0xFF94A3B8), fontSize = 10.sp)
                                }
                            }
                            Icon(Icons.Default.ArrowDropDown, contentDescription = "Select", tint = Color(0xFF38BDF8), modifier = Modifier.size(22.dp))
                        }
                    }

                    // Cargo Description
                    OutlinedTextField(
                        value = cargoDescription,
                        onValueChange = { cargoDescription = it },
                        label = { Text("Cargo Description") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Weight & Quantity
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = quantityText,
                            onValueChange = { quantityText = it },
                            label = { Text("Quantity") },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = weightText,
                            onValueChange = { weightText = it },
                            label = { Text("Weight (kg)") },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                    }

                    Surface(
                        color = Color(0xFF0F2B48),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(modifier = Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Info, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                "Job will trigger immediate notification on logged-in Godown Manager's phone for driver allocation.",
                                color = Color(0xFF93C5FD),
                                fontSize = 10.sp
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val finalDelivery = if (isCustomDeliveryMode && customDeliveryInput.isNotBlank()) customDeliveryInput.trim() else selectedDelivery
                        val newJob = UiJobItem(
                            id = "job_${System.currentTimeMillis()}",
                            jobNumber = "JOB #${(10050..10099).random()}",
                            status = "AWAITING_ASSIGNMENT",
                            pickupName = selectedPickup,
                            deliveryName = finalDelivery,
                            cargoDetails = "$cargoDescription ($weightText kg)",
                            assignedDriver = "Unassigned",
                            priority = priorityText,
                            timeAgo = "Just now",
                            rejectionReason = null,
                            pickupLat = selectedPickupLat,
                            pickupLng = selectedPickupLng
                        )
                        jobsList = listOf(newJob) + jobsList
                        FleetNotificationManager.showOperationalAlert(
                            context,
                            "JOB_CREATED",
                            "New Delivery Job: ${newJob.jobNumber}",
                            "Pickup from $selectedPickup for $finalDelivery. Dispatched to Godown Manager for driver allocation."
                        )
                        successMessage = "Job ${newJob.jobNumber} created at $selectedPickup! Logged-in Godown Manager notified to select driver."
                        showAddJobModal = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Send, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Create Job & Notify Godown Manager", fontWeight = FontWeight.Bold)
                }
            },
            containerColor = Color(0xFF1E293B),
            titleContentColor = Color.White,
            textContentColor = Color(0xFFCBD5E1)
        )
    }

    // ==========================================
    // MODAL: SELECT PICKUP GODOWN / WAREHOUSE
    // ==========================================
    if (showPickupPicker) {
        AlertDialog(
            onDismissRequest = { showPickupPicker = false },
            title = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Select Pickup Godown", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    IconButton(onClick = { showPickupPicker = false }, modifier = Modifier.size(24.dp)) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = Color(0xFF94A3B8))
                    }
                }
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 380.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        "Choose warehouse or godown where parcel / consignment will be collected:",
                        color = Color(0xFF94A3B8),
                        fontSize = 11.sp
                    )

                    godownsList.forEach { g ->
                        val isSelected = selectedPickup == g.name
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = if (isSelected) Color(0xFF064E3B) else Color(0xFF0F172A)
                            ),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    selectedPickup = g.name
                                    selectedPickupLat = g.latitude
                                    selectedPickupLng = g.longitude
                                    showPickupPicker = false
                                }
                                .border(
                                    width = if (isSelected) 1.5.dp else 1.dp,
                                    color = if (isSelected) Color(0xFF10B981) else Color(0xFF334155),
                                    shape = RoundedCornerShape(8.dp)
                                )
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                    Icon(
                                        Icons.Default.Warehouse,
                                        contentDescription = null,
                                        tint = if (isSelected) Color(0xFF10B981) else Color(0xFFF59E0B),
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Column {
                                        Text(g.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                        Text(g.address, color = Color(0xFF94A3B8), fontSize = 10.sp, maxLines = 1)
                                        Text(
                                            "📍 Lat: ${g.latitude}, Lng: ${g.longitude} • Geofence: ${g.radiusMeters}m",
                                            color = Color(0xFF10B981),
                                            fontSize = 9.sp,
                                            fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                                        )
                                    }
                                }
                                if (isSelected) {
                                    Icon(Icons.Default.CheckCircle, contentDescription = "Selected", tint = Color(0xFF10B981), modifier = Modifier.size(18.dp))
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))
                    Button(
                        onClick = {
                            showPickupPicker = false
                            showAddGodownModal = true
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.AddLocation, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("+ Add New Godown with Coordinates", fontSize = 11.sp, color = Color(0xFF10B981))
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { showPickupPicker = false }) {
                    Text("Cancel", color = Color(0xFF94A3B8))
                }
            },
            containerColor = Color(0xFF1E293B),
            titleContentColor = Color.White,
            textContentColor = Color(0xFFCBD5E1)
        )
    }

    // ==========================================
    // MODAL: SELECT DELIVERY DESTINATION
    // ==========================================
    val standardDestinations = listOf(
        "Metro Hypermarket Malleshwaram" to "Retail Supercenter • Malleshwaram 8th Cross",
        "Indiranagar Retail Outlet" to "Commercial Store • 100ft Road Indiranagar",
        "Koramangala Logistics Bay" to "Distribution Center • 5th Block Koramangala",
        "Jayanagar Commercial Hub" to "Commercial Bay • 4th Block Jayanagar",
        "Whitefield Tech Park" to "Corporate Delivery • ITPL Main Road",
        "Hebbal Retail Depot" to "Wholesale Center • Bellary Road Hebbal",
        "Marathahalli Commercial Zone" to "Commercial Hub • Outer Ring Road"
    )

    if (showDeliveryPicker) {
        AlertDialog(
            onDismissRequest = { showDeliveryPicker = false },
            title = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Select Delivery Destination", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    IconButton(onClick = { showDeliveryPicker = false }, modifier = Modifier.size(24.dp)) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = Color(0xFF94A3B8))
                    }
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
                    Text(
                        "Choose standard commercial hub, inter-godown transfer, or custom address:",
                        color = Color(0xFF94A3B8),
                        fontSize = 11.sp
                    )

                    // Custom input option
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F2B48)),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.EditLocation, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Custom Customer Destination:", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                            OutlinedTextField(
                                value = customDeliveryInput,
                                onValueChange = { customDeliveryInput = it },
                                placeholder = { Text("e.g. Phoenix Marketcity Store #4, Mahadevapura", fontSize = 11.sp) },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth()
                            )
                            if (customDeliveryInput.isNotBlank()) {
                                Button(
                                    onClick = {
                                        selectedDelivery = customDeliveryInput.trim()
                                        isCustomDeliveryMode = true
                                        showDeliveryPicker = false
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                                    shape = RoundedCornerShape(6.dp),
                                    modifier = Modifier.fillMaxWidth(),
                                    contentPadding = PaddingValues(vertical = 4.dp)
                                ) {
                                    Text("Use Custom Destination", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }

                    Text("Commercial & Retail Outlets:", color = Color(0xFF38BDF8), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    standardDestinations.forEach { (destName, destDesc) ->
                        val isSelected = !isCustomDeliveryMode && selectedDelivery == destName
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = if (isSelected) Color(0xFF0C4A6E) else Color(0xFF0F172A)
                            ),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    selectedDelivery = destName
                                    isCustomDeliveryMode = false
                                    showDeliveryPicker = false
                                }
                                .border(
                                    width = if (isSelected) 1.5.dp else 1.dp,
                                    color = if (isSelected) Color(0xFF38BDF8) else Color(0xFF334155),
                                    shape = RoundedCornerShape(8.dp)
                                )
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                    Icon(
                                        Icons.Default.Storefront,
                                        contentDescription = null,
                                        tint = if (isSelected) Color(0xFF38BDF8) else Color(0xFF94A3B8),
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Column {
                                        Text(destName, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                        Text(destDesc, color = Color(0xFF94A3B8), fontSize = 10.sp)
                                    }
                                }
                                if (isSelected) {
                                    Icon(Icons.Default.CheckCircle, contentDescription = "Selected", tint = Color(0xFF38BDF8), modifier = Modifier.size(18.dp))
                                }
                            }
                        }
                    }

                    Text("Inter-Godown Transfer (Other Warehouses):", color = Color(0xFFF59E0B), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    godownsList.forEach { g ->
                        val isSelected = !isCustomDeliveryMode && selectedDelivery == g.name
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = if (isSelected) Color(0xFF78350F) else Color(0xFF0F172A)
                            ),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    selectedDelivery = g.name
                                    isCustomDeliveryMode = false
                                    showDeliveryPicker = false
                                }
                                .border(
                                    width = if (isSelected) 1.5.dp else 1.dp,
                                    color = if (isSelected) Color(0xFFF59E0B) else Color(0xFF334155),
                                    shape = RoundedCornerShape(8.dp)
                                )
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                    Icon(
                                        Icons.Default.Warehouse,
                                        contentDescription = null,
                                        tint = if (isSelected) Color(0xFFF59E0B) else Color(0xFF94A3B8),
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Column {
                                        Text(g.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                        Text("${g.address} (Inter-hub)", color = Color(0xFF94A3B8), fontSize = 10.sp)
                                    }
                                }
                                if (isSelected) {
                                    Icon(Icons.Default.CheckCircle, contentDescription = "Selected", tint = Color(0xFFF59E0B), modifier = Modifier.size(18.dp))
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { showDeliveryPicker = false }) {
                    Text("Cancel", color = Color(0xFF94A3B8))
                }
            },
            containerColor = Color(0xFF1E293B),
            titleContentColor = Color.White,
            textContentColor = Color(0xFFCBD5E1)
        )
    }

    // ==========================================
    // MAIN SCREEN CONTENT
    // ==========================================
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
            .padding(16.dp)
    ) {
        // TOP ENTERPRISE HEADER
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        color = Color(0xFF10B981),
                        shape = RoundedCornerShape(4.dp),
                        modifier = Modifier.size(10.dp)
                    ) {}
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "FLEETOPS ENTERPRISE",
                        color = Color(0xFF94A3B8),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.2.sp
                    )
                }
                Text(
                    text = if (userRole == "ADMIN") "Edwin" else userName,
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.ExtraBold
                )
            }

            IconButton(
                onClick = { showLogoutDialog = true },
                colors = IconButtonDefaults.iconButtonColors(
                    containerColor = Color(0xFF1E293B)
                )
            ) {
                Icon(
                    imageVector = Icons.Default.ExitToApp,
                    contentDescription = "Log Out",
                    tint = Color(0xFFF87171)
                )
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Role Badge with Actions
        Surface(
            color = roleColor.copy(alpha = 0.15f),
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = roleLabel,
                        color = roleColor,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = userEmail,
                        color = Color(0xFF94A3B8),
                        fontSize = 10.sp
                    )
                }

                // Header Action: Keep Alive Tracking
                Button(
                    onClick = { showLiveFleetModal = true },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                    shape = RoundedCornerShape(6.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Icon(Icons.Default.Radio, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(13.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Keep-Alive Radar", color = Color(0xFF10B981), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // Success banner
        if (successMessage != null) {
            Spacer(modifier = Modifier.height(8.dp))
            Surface(
                color = Color(0xFF065F46),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF34D399), modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(successMessage!!, color = Color.White, fontSize = 11.sp, modifier = Modifier.weight(1f))
                    IconButton(onClick = { successMessage = null }, modifier = Modifier.size(16.dp)) {
                        Icon(Icons.Default.Close, contentDescription = null, tint = Color.White, modifier = Modifier.size(12.dp))
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // PRIMARY ACTION BUTTON: CREATE DELIVERY JOB
        Button(
            onClick = { showAddJobModal = true },
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF10B981)
            ),
            shape = RoundedCornerShape(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.AddCircle, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("+ Create Delivery Job", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }
                Icon(Icons.Default.ArrowForward, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // ==========================================
        // ROLE SPECIFIC OPERATIONAL WIDGETS
        // ==========================================
        when (userRole) {
            "GODOWN_MANAGER" -> {
                val pendingJobsCount = jobsList.count { it.status == "AWAITING_ASSIGNMENT" || it.status == "REJECTED" }
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = if (pendingJobsCount > 0) Color(0xFF451A03) else Color(0xFF1E293B)
                    ),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth().border(
                        1.dp,
                        if (pendingJobsCount > 0) Color(0xFFF59E0B) else Color(0xFF334155),
                        RoundedCornerShape(10.dp)
                    )
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.NotificationImportant, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    "Pending Driver Allocations: $pendingJobsCount",
                                    color = Color.White,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Text(
                                "Admin/Sales created orders awaiting your closest driver assignment",
                                color = Color(0xFF94A3B8),
                                fontSize = 10.sp
                            )
                        }

                        if (pendingJobsCount > 0) {
                            Button(
                                onClick = {
                                    val target = jobsList.firstOrNull { it.status == "AWAITING_ASSIGNMENT" || it.status == "REJECTED" }
                                    if (target != null) jobToAllocateDriver = target
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                                shape = RoundedCornerShape(6.dp),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                            ) {
                                Text("Assign Now", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF451A03))
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(10.dp))
            }

            "SALES_STAFF" -> {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.ShoppingCart, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Sales Desk & Live Fleet Radar", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                            Text("Real-time visibility into driver locations & keep-alive", color = Color(0xFF94A3B8), fontSize = 10.sp)
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Button(
                                onClick = { showGodownsModal = true },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                                shape = RoundedCornerShape(6.dp),
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Icon(Icons.Default.Warehouse, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(12.dp))
                                Spacer(modifier = Modifier.width(3.dp))
                                Text("Godowns", fontSize = 10.sp, color = Color(0xFFF59E0B))
                            }
                            Button(
                                onClick = { showLiveFleetModal = true },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                                shape = RoundedCornerShape(6.dp),
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Text("View Fleet", fontSize = 10.sp)
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(10.dp))
            }

            "ADMIN" -> {
                // ADMIN CONTROL ROW: Drivers, Vehicles, Staff, Godowns, and Daily Run Analytics
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                            modifier = Modifier.weight(1f).clickable { showDriversModal = true },
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Column(modifier = Modifier.padding(8.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Badge, contentDescription = null, tint = Color(0xFF34D399), modifier = Modifier.size(13.dp))
                                    Spacer(modifier = Modifier.width(3.dp))
                                    Text("Drivers", color = Color(0xFF94A3B8), fontSize = 9.sp)
                                }
                                Text("${driversRadarList.size}", color = Color(0xFF34D399), fontSize = 15.sp, fontWeight = FontWeight.Bold)
                                Text("Manage", color = Color(0xFF64748B), fontSize = 8.sp)
                            }
                        }

                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                            modifier = Modifier.weight(1f).clickable { showVehiclesModal = true },
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Column(modifier = Modifier.padding(8.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.DirectionsCar, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(13.dp))
                                    Spacer(modifier = Modifier.width(3.dp))
                                    Text("Vehicles", color = Color(0xFF94A3B8), fontSize = 9.sp)
                                }
                                Text("${vehiclesList.size}", color = Color(0xFF38BDF8), fontSize = 15.sp, fontWeight = FontWeight.Bold)
                                Text("Manage", color = Color(0xFF64748B), fontSize = 8.sp)
                            }
                        }

                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                            modifier = Modifier.weight(1f).clickable { showStaffModal = true },
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Column(modifier = Modifier.padding(8.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.People, contentDescription = null, tint = Color(0xFFA78BFA), modifier = Modifier.size(13.dp))
                                    Spacer(modifier = Modifier.width(3.dp))
                                    Text("Staff", color = Color(0xFF94A3B8), fontSize = 9.sp)
                                }
                                Text("${staffList.size}", color = Color(0xFFA78BFA), fontSize = 15.sp, fontWeight = FontWeight.Bold)
                                Text("GM/Sales", color = Color(0xFF64748B), fontSize = 8.sp)
                            }
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                            modifier = Modifier.weight(1f).clickable { showGodownsModal = true },
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Column(modifier = Modifier.padding(8.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Warehouse, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(13.dp))
                                    Spacer(modifier = Modifier.width(3.dp))
                                    Text("Godowns", color = Color(0xFF94A3B8), fontSize = 9.sp)
                                }
                                Text("${godownsList.size}", color = Color(0xFFF59E0B), fontSize = 15.sp, fontWeight = FontWeight.Bold)
                                Text("GPS Map", color = Color(0xFF64748B), fontSize = 8.sp)
                            }
                        }

                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                            modifier = Modifier.weight(1.2f).clickable { showDailyMetricsModal = true },
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Column(modifier = Modifier.padding(8.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Equalizer, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(13.dp))
                                    Spacer(modifier = Modifier.width(3.dp))
                                    Text("Daily Run Analytics", color = Color(0xFF94A3B8), fontSize = 9.sp)
                                }
                                Text("Analytics", color = Color(0xFF10B981), fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                Text("KM & Dwell Time", color = Color(0xFF64748B), fontSize = 8.sp)
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(10.dp))
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
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF64748B),
                letterSpacing = 1.sp
            )
            Text(
                text = "${jobsList.size} Jobs",
                fontSize = 11.sp,
                color = Color(0xFF94A3B8)
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        // JOBS LIST FEED
        LazyColumn(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(jobsList) { job ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth().border(
                        width = 1.dp,
                        color = when (job.status) {
                            "AWAITING_ASSIGNMENT" -> Color(0xFFF59E0B)
                            "REJECTED" -> Color(0xFFEF4444)
                            "IN PROGRESS" -> Color(0xFF3B82F6)
                            "COMPLETED" -> Color(0xFF10B981)
                            else -> Color(0xFF334155)
                        },
                        shape = RoundedCornerShape(12.dp)
                    )
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = job.jobNumber,
                                color = Color.White,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 14.sp
                            )
                            val statusBg = when (job.status) {
                                "AWAITING_ASSIGNMENT" -> Color(0xFFF59E0B).copy(alpha = 0.2f)
                                "REJECTED" -> Color(0xFFEF4444).copy(alpha = 0.2f)
                                "IN PROGRESS" -> Color(0xFF3B82F6).copy(alpha = 0.2f)
                                "COMPLETED" -> Color(0xFF10B981).copy(alpha = 0.2f)
                                else -> Color(0xFF0284C7).copy(alpha = 0.2f)
                            }
                            val statusText = when (job.status) {
                                "AWAITING_ASSIGNMENT" -> Color(0xFFFBBF24)
                                "REJECTED" -> Color(0xFFF87171)
                                "IN PROGRESS" -> Color(0xFF60A5FA)
                                "COMPLETED" -> Color(0xFF34D399)
                                else -> Color(0xFF38BDF8)
                            }
                            Surface(
                                color = statusBg,
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = if (job.status == "AWAITING_ASSIGNMENT") "AWAITING DRIVER" else job.status,
                                    color = statusText,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }

                        // Rejection Remark Alert Banner
                        if (job.status == "REJECTED" && !job.rejectionReason.isNullOrBlank()) {
                            Spacer(modifier = Modifier.height(6.dp))
                            Surface(
                                color = Color(0xFF450A0A),
                                shape = RoundedCornerShape(6.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(modifier = Modifier.padding(6.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Warning, contentDescription = null, tint = Color(0xFFF87171), modifier = Modifier.size(14.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        "Driver Remark: ${job.rejectionReason}",
                                        color = Color(0xFFFCA5A5),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(13.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(text = "From: ${job.pickupName}", color = Color(0xFFCBD5E1), fontSize = 11.sp)
                        }

                        Spacer(modifier = Modifier.height(2.dp))

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Navigation, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(13.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(text = "To: ${job.deliveryName}", color = Color(0xFFCBD5E1), fontSize = 11.sp)
                        }

                        Spacer(modifier = Modifier.height(8.dp))
                        Divider(color = Color(0xFF334155), thickness = 0.5.dp)
                        Spacer(modifier = Modifier.height(6.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "Driver: ${job.assignedDriver}",
                                    color = if (job.assignedDriver == "Unassigned") Color(0xFFF59E0B) else Color(0xFF94A3B8),
                                    fontSize = 11.sp,
                                    fontWeight = if (job.assignedDriver == "Unassigned") FontWeight.Bold else FontWeight.Normal
                                )
                                Text(
                                    text = job.timeAgo,
                                    color = Color(0xFF64748B),
                                    fontSize = 9.sp
                                )
                            }

                            // ACTION BUTTONS BASED ON JOB STATE & USER ROLE
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                if (job.status == "AWAITING_ASSIGNMENT" || job.status == "REJECTED") {
                                    Button(
                                        onClick = { jobToAllocateDriver = job },
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = if (job.status == "REJECTED") Color(0xFFEF4444) else Color(0xFFF59E0B)
                                        ),
                                        shape = RoundedCornerShape(6.dp),
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                                    ) {
                                        Icon(Icons.Default.PersonAdd, contentDescription = null, modifier = Modifier.size(13.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text(
                                            if (job.status == "REJECTED") "Re-Assign Driver" else "Assign Driver",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                } else if (job.status == "OFFERED") {
                                    // Simulation controls for testing pairing flow
                                    TextButton(
                                        onClick = {
                                            jobsList = jobsList.map { j ->
                                                if (j.id == job.id) j.copy(status = "IN PROGRESS", timeAgo = "Started just now") else j
                                            }
                                            FleetNotificationManager.showOperationalAlert(
                                                context,
                                                "JOB_ACCEPTED",
                                                "✅ Job ${job.jobNumber} Accepted!",
                                                "Driver accepted offer with Tata Ace. Route navigation active."
                                            )
                                            successMessage = "Driver accepted ${job.jobNumber}. Active on route."
                                        },
                                        contentPadding = PaddingValues(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        Text("Accept", fontSize = 10.sp, color = Color(0xFF10B981), fontWeight = FontWeight.Bold)
                                    }

                                    TextButton(
                                        onClick = { jobToRejectWithRemark = job },
                                        contentPadding = PaddingValues(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        Text("Reject", fontSize = 10.sp, color = Color(0xFFF87171), fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
