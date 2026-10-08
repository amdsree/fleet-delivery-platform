package com.fleet.delivery.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.fleet.delivery.data.local.AppDatabase
import com.fleet.delivery.data.remote.BatchGpsRequest
import com.fleet.delivery.data.remote.FleetApiService
import com.fleet.delivery.data.remote.GpsPointPayload
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class OfflineSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    private val db = AppDatabase.getInstance(appContext)

    private val api: FleetApiService = com.fleet.delivery.data.remote.ApiClient.service

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            // 1. Sync Batched GPS Points
            val unsyncedPoints = db.gpsDao().getUnsyncedPoints(limit = 100)
            if (unsyncedPoints.isNotEmpty()) {
                val driverId = unsyncedPoints.first().driverId
                val jobId = unsyncedPoints.first().jobId

                val payloadList = unsyncedPoints.map {
                    GpsPointPayload(
                        latitude = it.latitude,
                        longitude = it.longitude,
                        accuracy = it.accuracy,
                        speed = it.speed,
                        bearing = it.bearing,
                        altitude = it.altitude,
                        is_mock = it.isMock,
                        timestamp_device = it.timestampDevice
                    )
                }

                val batchRequest = BatchGpsRequest(
                    driver_id = driverId,
                    job_id = jobId,
                    points = payloadList
                )

                val response = api.uploadGpsBatch(batchRequest)
                if (response.isSuccessful) {
                    val ids = unsyncedPoints.map { it.id }
                    db.gpsDao().markAsSynced(ids)
                    db.gpsDao().clearSyncedPoints()
                } else {
                    return@withContext Result.retry()
                }
            }

            // 2. Sync Offline Queued Operational Events (Idempotent)
            val pendingEvents = db.syncEventDao().getPendingEvents()
            for (event in pendingEvents) {
                try {
                    // Update state to SYNCING
                    db.syncEventDao().updateEventStatus(event.clientEventId, "SYNCING")

                    // Event handling according to type
                    when (event.eventType) {
                        "ARRIVAL" -> {
                            val req = Gson().fromJson(event.payloadJson, com.fleet.delivery.data.remote.StopArrivalRequest::class.java)
                            val res = api.arriveAtStop(event.entityId, req)
                            if (res.isSuccessful) {
                                db.syncEventDao().updateEventStatus(event.clientEventId, "SYNCED")
                            }
                        }
                        "POD" -> {
                            val req = Gson().fromJson(event.payloadJson, com.fleet.delivery.data.remote.PodRequest::class.java)
                            val res = api.submitPod(req)
                            if (res.isSuccessful) {
                                db.syncEventDao().updateEventStatus(event.clientEventId, "SYNCED")
                            }
                        }
                        "STOP_COMPLETE" -> {
                            val res = api.completeStopOperation(event.entityId)
                            if (res.isSuccessful) {
                                db.syncEventDao().updateEventStatus(event.clientEventId, "SYNCED")
                            }
                        }
                    }
                } catch (e: Exception) {
                    db.syncEventDao().updateEventStatus(event.clientEventId, "PENDING")
                }
            }

            db.syncEventDao().clearCompletedEvents()
            Result.success()
        } catch (e: Exception) {
            e.printStackTrace()
            Result.retry()
        }
    }
}
