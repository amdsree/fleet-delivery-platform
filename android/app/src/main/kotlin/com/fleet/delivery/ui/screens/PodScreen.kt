package com.fleet.delivery.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fleet.delivery.ui.components.SignaturePad

@Composable
fun PodScreen(
    stopId: String = "stop-2",
    expectedQty: Int = 45,
    onSubmitPod: (receiver: String, phone: String, delivered: Int, damaged: Int, shortage: Int, signature: String) -> Unit,
    onCancel: () -> Unit
) {
    var receiverName by remember { mutableStateOf("") }
    var receiverPhone by remember { mutableStateOf("") }
    var deliveredQty by remember { mutableStateOf(expectedQty.toString()) }
    var damagedQty by remember { mutableStateOf("0") }
    var shortageQty by remember { mutableStateOf("0") }
    var capturedSignature by remember { mutableStateOf("") }

    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
            .padding(16.dp)
            .verticalScroll(scrollState)
    ) {
        Text(
            text = "Proof of Delivery (POD)",
            color = Color.White,
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = "Record customer verification, digital signature, and damage/shortage counts.",
            color = Color(0xFF94A3B8),
            fontSize = 12.sp,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        // Customer Details
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = receiverName,
                    onValueChange = { receiverName = it },
                    label = { Text("Customer / Receiver Name *") },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFF10B981)
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = receiverPhone,
                    onValueChange = { receiverPhone = it },
                    label = { Text("Receiver Phone Number") },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFF10B981)
                    ),
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        // Quantities & Discrepancies
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Cargo Item Quantities", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = deliveredQty,
                        onValueChange = { deliveredQty = it },
                        label = { Text("Delivered Qty") },
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = damagedQty,
                        onValueChange = { damagedQty = it },
                        label = { Text("Damaged Qty") },
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = shortageQty,
                        onValueChange = { shortageQty = it },
                        label = { Text("Shortage Qty") },
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        // Digital Signature Canvas
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Digital Customer Signature *", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Spacer(modifier = Modifier.height(8.dp))
                SignaturePad(onSignatureCaptured = { capturedSignature = it })
            }
        }

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedButton(
                onClick = onCancel,
                modifier = Modifier.weight(1f).height(48.dp)
            ) {
                Text("Cancel", color = Color.White)
            }

            Button(
                onClick = {
                    val dQty = deliveredQty.toIntOrNull() ?: expectedQty
                    val damQty = damagedQty.toIntOrNull() ?: 0
                    val shortQty = shortageQty.toIntOrNull() ?: 0
                    onSubmitPod(receiverName, receiverPhone, dQty, damQty, shortQty, capturedSignature)
                },
                enabled = receiverName.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF059669)),
                modifier = Modifier.weight(1f).height(48.dp)
            ) {
                Text("SUBMIT POD", fontWeight = FontWeight.Bold)
            }
        }
    }
}
