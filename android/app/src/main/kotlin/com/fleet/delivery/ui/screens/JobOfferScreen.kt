package com.fleet.delivery.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun JobOfferScreen(
    jobId: String = "JOB-2026-5001",
    vendorName: String = "Alpha Wholesale Depot",
    vendorAddress: String = "Peenya Industrial Area Phase 1, Bangalore",
    deliveryAddress: String = "Metro Hypermarket, Malleshwaram",
    distanceKm: Double = 8.6,
    estimatedMinutes: Int = 28,
    cargoLoadKg: Double = 420.5,
    suggestedVehicle: String = "KA-04-AB-1234 (Tata Ace)",
    onAccept: (String) -> Unit,
    onReject: (String) -> Unit
) {
    var showRejectDialog by remember { mutableStateOf(false) }
    var selectedRejectReason by remember { mutableStateOf("VEHICLE_CAPACITY") }
    val scrollState = rememberScrollState()

    val rejectReasons = listOf(
        "VEHICLE_CAPACITY" to "Cargo exceeds vehicle capacity",
        "VEHICLE_UNAVAILABLE" to "Vehicle under maintenance / key unavailable",
        "DRIVER_UNAVAILABLE" to "Shift ending / hours exceeded",
        "ALREADY_COMMITTED" to "Already assigned to another delivery",
        "PERSONAL_REASON" to "Medical / emergency",
        "OTHER" to "Other operational issue"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
            .verticalScroll(scrollState)
            .padding(20.dp)
    ) {
        Surface(
            color = Color(0xFF1E3A8A),
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier.padding(bottom = 12.dp)
        ) {
            Text(
                text = "NEW DISPATCH OFFER (EXPIRES IN 45s)",
                color = Color(0xFF93C5FD),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
            )
        }

        Text(
            text = "Pickup: $vendorName",
            color = Color.White,
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = vendorAddress,
            color = Color(0xFF94A3B8),
            fontSize = 12.sp,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Delivery Destination:", color = Color(0xFF94A3B8), fontSize = 12.sp)
                    Text(deliveryAddress, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Transit Distance:", color = Color(0xFF94A3B8), fontSize = 12.sp)
                    Text("$distanceKm km", color = Color(0xFF38BDF8), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Estimated Travel:", color = Color(0xFF94A3B8), fontSize = 12.sp)
                    Text("$estimatedMinutes mins", color = Color(0xFF38BDF8), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Total Cargo Weight:", color = Color(0xFF94A3B8), fontSize = 12.sp)
                    Text("$cargoLoadKg kg", color = Color(0xFFFBBF24), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Suggested Vehicle:", color = Color(0xFF94A3B8), fontSize = 12.sp)
                    Text(suggestedVehicle, color = Color(0xFF34D399), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedButton(
                onClick = { showRejectDialog = true },
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFF87171)),
                modifier = Modifier
                    .weight(1f)
                    .height(52.dp)
            ) {
                Text("REJECT", fontWeight = FontWeight.Bold)
            }

            Button(
                onClick = { onAccept(jobId) },
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF059669)),
                modifier = Modifier
                    .weight(1f)
                    .height(52.dp)
            ) {
                Text("ACCEPT JOB", fontWeight = FontWeight.Bold)
            }
        }
    }

    if (showRejectDialog) {
        AlertDialog(
            onDismissRequest = { showRejectDialog = false },
            title = { Text("Reason for Rejection", fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text("Select operational rejection reason for audit trail:")
                    Spacer(modifier = Modifier.height(8.dp))
                    rejectReasons.forEach { (code, label) ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
                        ) {
                            RadioButton(
                                selected = selectedRejectReason == code,
                                onClick = { selectedRejectReason = code }
                            )
                            Text(label, fontSize = 12.sp, modifier = Modifier.padding(start = 4.dp))
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        showRejectDialog = false
                        onReject(selectedRejectReason)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                ) {
                    Text("Confirm Rejection")
                }
            },
            dismissButton = {
                TextButton(onClick = { showRejectDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}
