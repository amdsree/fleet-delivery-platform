package com.fleet.delivery.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Place
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class StopModel(
    val id: String,
    val sequence: Int,
    val type: String, // PICKUP, DELIVERY, RETURN
    val locationName: String,
    val address: String,
    val status: String // PENDING, EN_ROUTE, ARRIVED, IN_PROGRESS, COMPLETED
)

@Composable
fun ActiveJobScreen(
    jobId: String = "JOB-2026-5001",
    onArriveClick: (String) -> Unit,
    onStartOperationClick: (String) -> Unit,
    onOpenPodClick: (String) -> Unit,
    onCompleteStopClick: (String) -> Unit
) {
    var stops by remember {
        mutableStateOf(
            listOf(
                StopModel(
                    "stop-1",
                    1,
                    "PICKUP",
                    "Alpha Wholesale Depot",
                    "Peenya Industrial Area Phase 1",
                    "ARRIVED"
                ),
                StopModel(
                    "stop-2",
                    2,
                    "DELIVERY",
                    "Metro Hypermarket",
                    "Malleshwaram Sampige Road",
                    "PENDING"
                ),
                StopModel(
                    "stop-3",
                    3,
                    "RETURN",
                    "Central Warehouse Yeshwanthpur",
                    "Industrial Suburb, Bangalore",
                    "PENDING"
                )
            )
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "JOB #$jobId",
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Multi-Stop Delivery Route",
                    color = Color(0xFF94A3B8),
                    fontSize = 12.sp
                )
            }

            Surface(
                color = Color(0xFF064E3B),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text(
                    text = "GPS STREAMING (15s)",
                    color = Color(0xFF34D399),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier.weight(1f)
        ) {
            items(stops) { stop ->
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = if (stop.status == "ARRIVED" || stop.status == "IN_PROGRESS")
                            Color(0xFF1E293B)
                        else
                            Color(0xFF111827)
                    ),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = "Stop #${stop.sequence} - ${stop.type}",
                                    color = if (stop.type == "PICKUP") Color(0xFF38BDF8) else Color(0xFFA855F7),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }

                            Text(
                                text = stop.status,
                                color = if (stop.status == "COMPLETED") Color(0xFF10B981) else Color(0xFFFBBF24),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Spacer(modifier = Modifier.height(4.dp))
                        Text(stop.locationName, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                        Text(stop.address, color = Color(0xFF94A3B8), fontSize = 12.sp)

                        Spacer(modifier = Modifier.height(12.dp))

                        // Operational Action Buttons per Stop State
                        when (stop.status) {
                            "PENDING", "EN_ROUTE" -> {
                                Button(
                                    onClick = {
                                        stops = stops.map { if (it.id == stop.id) it.copy(status = "ARRIVED") else it }
                                        onArriveClick(stop.id)
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("CONFIRM ARRIVAL (OR GEOFENCE AUTO)")
                                }
                            }
                            "ARRIVED" -> {
                                Button(
                                    onClick = {
                                        stops = stops.map { if (it.id == stop.id) it.copy(status = "IN_PROGRESS") else it }
                                        onStartOperationClick(stop.id)
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706)),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text(if (stop.type == "PICKUP") "START LOADING CARGO" else "START UNLOADING")
                                }
                            }
                            "IN_PROGRESS" -> {
                                if (stop.type == "DELIVERY") {
                                    Button(
                                        onClick = { onOpenPodClick(stop.id) },
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF059669)),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Text("CAPTURE POD (SIGNATURE & SHORTAGE)")
                                    }
                                } else {
                                    Button(
                                        onClick = {
                                            stops = stops.map { if (it.id == stop.id) it.copy(status = "COMPLETED") else it }
                                            onCompleteStopClick(stop.id)
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF059669)),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Text("COMPLETE PICKUP & DEPART")
                                    }
                                }
                            }
                            "COMPLETED" -> {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Stop Successfully Finished", color = Color(0xFF10B981), fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
