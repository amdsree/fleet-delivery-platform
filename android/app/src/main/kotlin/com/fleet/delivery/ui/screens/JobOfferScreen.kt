package com.fleet.delivery.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.rememberScrollState
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

data class VehicleOption(
    val category: String, // "SMALL", "MEDIUM", "LARGE"
    val categoryLabel: String,
    val parcelSizeText: String,
    val vehicleName: String,
    val regNumber: String,
    val capacityKg: Int,
    val iconDescription: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JobOfferScreen(
    jobId: String = "JOB-2026-5001",
    vendorName: String = "Alpha Wholesale Depot",
    vendorAddress: String = "Peenya Central Godown, Phase 1, Bangalore",
    deliveryAddress: String = "Metro Hypermarket, Malleshwaram",
    distanceKm: Double = 8.6,
    estimatedMinutes: Int = 28,
    cargoLoadKg: Double = 420.5,
    onAccept: (jobId: String, selectedVehicle: String) -> Unit,
    onReject: (jobId: String, reason: String, remarks: String) -> Unit
) {
    var showRejectDialog by remember { mutableStateOf(false) }
    var selectedRejectReason by remember { mutableStateOf("VEHICLE_CAPACITY") }
    var rejectionRemarkText by remember { mutableStateOf("") }
    val scrollState = rememberScrollState()

    val vehicleOptions = listOf(
        VehicleOption(
            category = "SMALL",
            categoryLabel = "Small Parcel (< 20 kg)",
            parcelSizeText = "Document / Single Carton / Express",
            vehicleName = "Piaggio Ape Electric / EV 3-Wheeler",
            regNumber = "KA-03-GH-3456",
            capacityKg = 500,
            iconDescription = "Small parcel express"
        ),
        VehicleOption(
            category = "MEDIUM",
            categoryLabel = "Medium Parcel (20 - 500 kg)",
            parcelSizeText = "FMCG Cartons / Retail Consignment",
            vehicleName = "Tata Ace Gold (Mini Truck)",
            regNumber = "KA-04-AB-1234",
            capacityKg = 750,
            iconDescription = "Medium delivery truck"
        ),
        VehicleOption(
            category = "LARGE",
            categoryLabel = "Large Freight (> 500 kg)",
            parcelSizeText = "Heavy Pallets / Industrial Bulk",
            vehicleName = "Eicher Pro 1049 (Medium Truck)",
            regNumber = "KA-05-CD-5678",
            capacityKg = 2500,
            iconDescription = "Heavy cargo truck"
        )
    )

    // Default vehicle selection based on cargo weight (420.5kg -> MEDIUM)
    var selectedVehicleCategory by remember {
        mutableStateOf(if (cargoLoadKg > 500) "LARGE" else if (cargoLoadKg > 20) "MEDIUM" else "SMALL")
    }

    val selectedOption = vehicleOptions.firstOrNull { it.category == selectedVehicleCategory } ?: vehicleOptions[1]

    val rejectReasons = listOf(
        "VEHICLE_CAPACITY" to "Cargo exceeds selected vehicle payload",
        "VEHICLE_UNAVAILABLE" to "Vehicle under maintenance / key unavailable",
        "DRIVER_UNAVAILABLE" to "Shift ended / maximum driving hours reached",
        "ALREADY_COMMITTED" to "Already processing another order / active run",
        "ROAD_BLOCKAGE" to "Route flooded / heavy road blockage",
        "OTHER" to "Other operational remark"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Offer Status Pill
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                color = Color(0xFF1E3A8A),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text(
                    text = "🚨 NEW DISPATCH OFFER • EXPIRES IN 45s",
                    color = Color(0xFF93C5FD),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                )
            }
            Text(jobId, color = Color(0xFF94A3B8), fontSize = 11.sp, fontWeight = FontWeight.Bold)
        }

        // Location Card
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(verticalAlignment = Alignment.Top) {
                    Icon(Icons.Default.Warehouse, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text("Pickup Godown", color = Color(0xFF94A3B8), fontSize = 11.sp)
                        Text(vendorName, color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                        Text(vendorAddress, color = Color(0xFF64748B), fontSize = 11.sp)
                    }
                }

                Divider(color = Color(0xFF334155), thickness = 0.5.dp)

                Row(verticalAlignment = Alignment.Top) {
                    Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text("Delivery Destination", color = Color(0xFF94A3B8), fontSize = 11.sp)
                        Text(deliveryAddress, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("📍 Distance: $distanceKm km", color = Color(0xFF38BDF8), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    Text("⏱️ Est. Time: $estimatedMinutes mins", color = Color(0xFFFBBF24), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    Text("⚖️ Load: $cargoLoadKg kg", color = Color(0xFF34D399), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // ==========================================
        // DRIVER VEHICLE CHOICE BASED ON PARCEL SIZE
        // ==========================================
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Choose Vehicle Based on Parcel Size",
                        color = Color.White,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text("Mandatory", color = Color(0xFF10B981), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                }

                Text(
                    text = "Select vehicle category that matches this $cargoLoadKg kg cargo load:",
                    color = Color(0xFF94A3B8),
                    fontSize = 11.sp
                )

                vehicleOptions.forEach { opt ->
                    val isSelected = opt.category == selectedVehicleCategory
                    Surface(
                        color = if (isSelected) Color(0xFF0F2B48) else Color(0xFF0F172A),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(
                                width = if (isSelected) 1.5.dp else 1.dp,
                                color = if (isSelected) Color(0xFF38BDF8) else Color(0xFF334155),
                                shape = RoundedCornerShape(8.dp)
                            )
                            .clickable { selectedVehicleCategory = opt.category }
                    ) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(
                                selected = isSelected,
                                onClick = { selectedVehicleCategory = opt.category },
                                colors = RadioButtonDefaults.colors(selectedColor = Color(0xFF38BDF8))
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(opt.categoryLabel, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    if (opt.category == "MEDIUM" && cargoLoadKg <= 750) {
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Surface(
                                            color = Color(0xFF065F46),
                                            shape = RoundedCornerShape(4.dp)
                                        ) {
                                            Text("MATCHES LOAD", color = Color(0xFF6EE7B7), fontSize = 8.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp))
                                        }
                                    }
                                }
                                Text("${opt.vehicleName} • ${opt.regNumber}", color = Color(0xFF38BDF8), fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                                Text("Payload limit: ${opt.capacityKg} kg (${opt.parcelSizeText})", color = Color(0xFF94A3B8), fontSize = 10.sp)
                            }
                        }
                    }
                }
            }
        }

        // Selected Vehicle Summary
        Surface(
            color = Color(0xFF022C22),
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier.fillMaxWidth().border(1.dp, Color(0xFF059669), RoundedCornerShape(8.dp))
        ) {
            Row(
                modifier = Modifier.padding(10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    "Selected: ${selectedOption.regNumber} (${selectedOption.vehicleName})",
                    color = Color(0xFF6EE7B7),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Action Buttons: REJECT with remarks or ACCEPT & START JOB
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedButton(
                onClick = { showRejectDialog = true },
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFF87171)),
                modifier = Modifier.weight(1f).height(50.dp)
            ) {
                Icon(Icons.Default.Close, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("REJECT TASK", fontWeight = FontWeight.Bold, fontSize = 12.sp)
            }

            Button(
                onClick = {
                    onAccept(jobId, "${selectedOption.regNumber} (${selectedOption.vehicleName})")
                },
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF059669)),
                modifier = Modifier.weight(1.3f).height(50.dp)
            ) {
                Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("START JOB", fontWeight = FontWeight.Bold, fontSize = 13.sp)
            }
        }
    }

    // ==========================================
    // REJECTION DIALOG WITH AUDIT REMARK INPUT
    // ==========================================
    if (showRejectDialog) {
        AlertDialog(
            onDismissRequest = { showRejectDialog = false },
            title = {
                Text(
                    "Reject Task & Notify Godown Manager",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = Color(0xFFEF4444)
                )
            },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        "Please provide rejection reason and operational remarks so the Godown Manager can assign another driver:",
                        fontSize = 11.sp,
                        color = Color(0xFF94A3B8)
                    )

                    rejectReasons.forEach { (code, label) ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { selectedRejectReason = code }
                                .padding(vertical = 2.dp)
                        ) {
                            RadioButton(
                                selected = selectedRejectReason == code,
                                onClick = { selectedRejectReason = code },
                                colors = RadioButtonDefaults.colors(selectedColor = Color(0xFFEF4444))
                            )
                            Text(label, fontSize = 11.sp, color = Color.White)
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    OutlinedTextField(
                        value = rejectionRemarkText,
                        onValueChange = { rejectionRemarkText = it },
                        label = { Text("Driver Remark (e.g. Heavy delay, flat tire)") },
                        placeholder = { Text("Detail reason for reassignment...") },
                        maxLines = 3,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        showRejectDialog = false
                        val remark = if (rejectionRemarkText.isNotBlank()) rejectionRemarkText.trim() else "Driver operational decline"
                        onReject(jobId, selectedRejectReason, remark)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                ) {
                    Text("Confirm Rejection & Notify GM")
                }
            },
            dismissButton = {
                TextButton(onClick = { showRejectDialog = false }) {
                    Text("Cancel", color = Color(0xFF94A3B8))
                }
            },
            containerColor = Color(0xFF1E293B),
            titleContentColor = Color.White,
            textContentColor = Color(0xFFCBD5E1)
        )
    }
}
