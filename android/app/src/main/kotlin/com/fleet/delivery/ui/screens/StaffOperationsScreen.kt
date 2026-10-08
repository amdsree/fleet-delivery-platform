package com.fleet.delivery.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
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
    var showVehiclesModal by remember { mutableStateOf(false) }
    var showAddVehicleModal by remember { mutableStateOf(false) }
    var showStaffModal by remember { mutableStateOf(false) }
    var showAddStaffModal by remember { mutableStateOf(false) }
    var showGodownsModal by remember { mutableStateOf(false) }
    var showAddGodownModal by remember { mutableStateOf(false) }

    // State for delete confirmations
    var itemToDeleteType by remember { mutableStateOf<String?>(null) }
    var itemToDeleteId by remember { mutableStateOf<String?>(null) }
    var itemToDeleteName by remember { mutableStateOf<String?>(null) }

    // Staff tab selection in staff modal
    var staffModalTab by remember { mutableStateOf("GODOWN_MANAGER") }

    // Job Creation Form State
    var selectedPickup by remember { mutableStateOf("Peenya Central Godown") }
    var selectedDelivery by remember { mutableStateOf("Metro Hypermarket Malleshwaram") }
    var cargoDescription by remember { mutableStateOf("FMCG Consignment (40 Cases)") }
    var quantityText by remember { mutableStateOf("40") }
    var weightText by remember { mutableStateOf("250") }
    var priorityText by remember { mutableStateOf("High Priority") }
    var assignMode by remember { mutableStateOf("AUTO") }
    var selectedDriver by remember { mutableStateOf("Driver 1 (Kiran Kumar)") }

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
    val coroutineScope = rememberCoroutineScope()

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

    var jobsList by remember {
        mutableStateOf(
            listOf(
                UiJobItem("1", "JOB #10045", "IN PROGRESS", "Peenya Central Godown", "Metro Hypermarket Malleshwaram", "50 Cartons Packaged Foods (350 kg)", "Kiran Kumar (KA-04-AB-1234)", "High", "12 mins ago"),
                UiJobItem("2", "JOB #10044", "OFFERED", "Whitefield Depot", "Indiranagar Retail Outlet", "20 Barrels Lubricant (200 kg)", "Ramesh Babu (KA-05-CD-5678)", "Normal", "25 mins ago"),
                UiJobItem("3", "JOB #10043", "COMPLETED", "Electronic City Warehouse", "Koramangala Logistics Bay", "15 Crates Electronics (120 kg)", "Sunil V (KA-51-EF-9012)", "Critical", "1 hour ago")
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

    // ==========================================
    // MODAL: MANAGE FLEET VEHICLES
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
                    Text("Fleet Vehicles (${vehiclesList.size})", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Button(
                        onClick = { showAddVehicleModal = true },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
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
                        .heightIn(max = 400.dp)
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
                                    Text("${v.model} • ${v.capacityKg}", color = Color(0xFF94A3B8), fontSize = 11.sp)
                                    Text("Status: ${v.status}", color = if (v.status == "AVAILABLE") Color(0xFF10B981) else Color(0xFFF59E0B), fontSize = 10.sp)
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
                        label = { Text("Plate / Reg Number (e.g. KA-02-XY-9999)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = newVehicleModel,
                        onValueChange = { newVehicleModel = it },
                        label = { Text("Model Name (e.g. Tata Ace Gold)") },
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
                            successMessage = "Vehicle ${newV.regNumber} registered successfully."
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
    // MODAL: MANAGE STAFF (GODOWN MGRS & SALES)
    // ==========================================
    if (showStaffModal) {
        AlertDialog(
            onDismissRequest = { showStaffModal = false },
            title = {
                Column(modifier = Modifier.fillMaxWidth()) {
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
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (staffModalTab == "GODOWN_MANAGER") Color(0xFFF59E0B) else Color(0xFF38BDF8)
                            ),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(if (staffModalTab == "GODOWN_MANAGER") "+ Add GM" else "+ Add Sales", fontSize = 12.sp)
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(modifier = Modifier.fillMaxWidth()) {
                        Button(
                            onClick = { staffModalTab = "GODOWN_MANAGER" },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (staffModalTab == "GODOWN_MANAGER") Color(0xFFF59E0B) else Color(0xFF0F172A)
                            ),
                            shape = RoundedCornerShape(topStart = 8.dp, bottomStart = 8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Godown Mgrs", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                        Button(
                            onClick = { staffModalTab = "SALES_STAFF" },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (staffModalTab == "SALES_STAFF") Color(0xFF38BDF8) else Color(0xFF0F172A)
                            ),
                            shape = RoundedCornerShape(topEnd = 8.dp, bottomEnd = 8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Sales Staff", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            },
            text = {
                val filteredStaff = staffList.filter { it.role == staffModalTab }
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 350.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (filteredStaff.isEmpty()) {
                        Text("No staff registered in this category.", color = Color(0xFF94A3B8), fontSize = 12.sp)
                    } else {
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
                                        Text("${s.phone} • ${s.assignedUnit}", color = Color(0xFF64748B), fontSize = 10.sp)
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
                                Spacer(modifier = Modifier.height(4.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.End
                                ) {
                                    TextButton(
                                        onClick = {
                                            val mapUri = Uri.parse("geo:${g.latitude},${g.longitude}?q=${g.latitude},${g.longitude}(${Uri.encode(g.name)})")
                                            val mapIntent = Intent(Intent.ACTION_VIEW, mapUri)
                                            try {
                                                context.startActivity(mapIntent)
                                            } catch (e: Exception) {
                                                // Fallback browser intent
                                                val webUri = Uri.parse("https://www.google.com/maps?q=${g.latitude},${g.longitude}")
                                                context.startActivity(Intent(Intent.ACTION_VIEW, webUri))
                                            }
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

                    // Verify on Google Maps button
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
    // MODAL: ADD DELIVERY JOB
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
                    // Pickup Godown
                    Text("Pickup Warehouse", color = Color(0xFF94A3B8), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(modifier = Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Warehouse, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(selectedPickup, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }

                    // Delivery Customer
                    Text("Delivery Destination", color = Color(0xFF94A3B8), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(modifier = Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(selectedDelivery, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
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

                    // Dispatch Strategy
                    Text("Driver Allocation Mode", color = Color(0xFF94A3B8), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Row(modifier = Modifier.fillMaxWidth()) {
                        Button(
                            onClick = { assignMode = "AUTO" },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (assignMode == "AUTO") Color(0xFF10B981) else Color(0xFF0F172A)
                            ),
                            shape = RoundedCornerShape(topStart = 8.dp, bottomStart = 8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Auto Dispatch", fontSize = 11.sp)
                        }
                        Button(
                            onClick = { assignMode = "MANUAL" },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (assignMode == "MANUAL") Color(0xFF10B981) else Color(0xFF0F172A)
                            ),
                            shape = RoundedCornerShape(topEnd = 8.dp, bottomEnd = 8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Manual Select", fontSize = 11.sp)
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val newJob = UiJobItem(
                            id = "job_${System.currentTimeMillis()}",
                            jobNumber = "JOB #${(10050..10099).random()}",
                            status = "OFFERED",
                            pickupName = selectedPickup,
                            deliveryName = selectedDelivery,
                            cargoDetails = "$cargoDescription ($weightText kg)",
                            assignedDriver = if (assignMode == "AUTO") "Auto-Ranked Nearest Driver" else selectedDriver,
                            priority = priorityText,
                            timeAgo = "Just now"
                        )
                        jobsList = listOf(newJob) + jobsList
                        successMessage = "Success! ${newJob.jobNumber} created & dispatched with push notification."
                        showAddJobModal = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Send, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Create & Dispatch Job", fontWeight = FontWeight.Bold)
                }
            },
            containerColor = Color(0xFF1E293B),
            titleContentColor = Color.White,
            textContentColor = Color(0xFFCBD5E1)
        )
    }

    // ==========================================
    // MAIN SCREEN LAYOUT
    // ==========================================
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
            .padding(16.dp)
    ) {
        // TOP HEADER BAR (Clean branding without provider labels)
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
                    imageVector = Icons.Default.ExitToApp,
                    contentDescription = "Log Out",
                    tint = Color(0xFFEF4444),
                    modifier = Modifier.size(20.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Success Alert Banner
        if (successMessage != null) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF065F46)),
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
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(42.dp)
                            .background(Color.White.copy(alpha = 0.2f), shape = RoundedCornerShape(12.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.AddCircle,
                            contentDescription = "Add Job",
                            tint = Color.White,
                            modifier = Modifier.size(26.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "+ ADD DELIVERY JOB",
                            color = Color.White,
                            fontSize = 15.sp,
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
                    modifier = Modifier.size(20.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // ROLE SPECIFIC OPERATIONAL WIDGETS
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
                // ADMIN MANAGEMENT ACTION CARDS (Vehicles, Staff, Warehouses)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                        modifier = Modifier
                            .weight(1f)
                            .clickable { showVehiclesModal = true },
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.DirectionsCar, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Vehicles", color = Color(0xFF94A3B8), fontSize = 10.sp)
                            }
                            Text("${vehiclesList.size}", color = Color(0xFF38BDF8), fontSize = 17.sp, fontWeight = FontWeight.Bold)
                            Text("Add / Delete", color = Color(0xFF64748B), fontSize = 9.sp)
                        }
                    }

                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                        modifier = Modifier
                            .weight(1f)
                            .clickable { showStaffModal = true },
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.People, contentDescription = null, tint = Color(0xFFA78BFA), modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Staff", color = Color(0xFF94A3B8), fontSize = 10.sp)
                            }
                            Text("${staffList.size}", color = Color(0xFFA78BFA), fontSize = 17.sp, fontWeight = FontWeight.Bold)
                            Text("GM & Sales", color = Color(0xFF64748B), fontSize = 9.sp)
                        }
                    }

                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                        modifier = Modifier
                            .weight(1f)
                            .clickable { showGodownsModal = true },
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Warehouse, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Godowns", color = Color(0xFF94A3B8), fontSize = 10.sp)
                            }
                            Text("${godownsList.size}", color = Color(0xFFF59E0B), fontSize = 17.sp, fontWeight = FontWeight.Bold)
                            Text("GPS Map Pin", color = Color(0xFF64748B), fontSize = 9.sp)
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
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp)
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
                                "IN PROGRESS" -> Color(0xFF3B82F6).copy(alpha = 0.2f)
                                "COMPLETED" -> Color(0xFF10B981).copy(alpha = 0.2f)
                                else -> Color(0xFF0284C7).copy(alpha = 0.2f)
                            }
                            val statusText = when (job.status) {
                                "IN PROGRESS" -> Color(0xFF60A5FA)
                                "COMPLETED" -> Color(0xFF34D399)
                                else -> Color(0xFF38BDF8)
                            }
                            Surface(
                                color = statusBg,
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = job.status,
                                    color = statusText,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(text = "From: ${job.pickupName}", color = Color(0xFFCBD5E1), fontSize = 11.sp)
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Navigation, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(text = "To: ${job.deliveryName}", color = Color(0xFFCBD5E1), fontSize = 11.sp)
                        }

                        Spacer(modifier = Modifier.height(10.dp))
                        Divider(color = Color(0xFF334155), thickness = 0.5.dp)
                        Spacer(modifier = Modifier.height(8.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Driver: ${job.assignedDriver}",
                                color = Color(0xFF94A3B8),
                                fontSize = 10.sp
                            )
                            Text(
                                text = job.timeAgo,
                                color = Color(0xFF64748B),
                                fontSize = 10.sp
                            )
                        }
                    }
                }
            }
        }
    }
}
