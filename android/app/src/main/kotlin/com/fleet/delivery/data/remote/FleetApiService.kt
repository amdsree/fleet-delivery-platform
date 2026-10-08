package com.fleet.delivery.data.remote

import retrofit2.Response
import retrofit2.http.*

data class LoginRequest(val identifier: String, val password: String, val fcm_token: String? = null)
data class LoginResponse(val access_token: String, val refresh_token: String, val user: UserPayload)
data class UserPayload(val id: String, val name: String, val email: String, val role: String, val driver_profile_id: String?)

data class DutyStatusRequest(val duty_status: String)
data class AcceptJobRequest(val vehicle_id: String)
data class RejectJobRequest(val reason: String, val remarks: String? = null)
data class StopArrivalRequest(val latitude: Double, val longitude: Double, val accuracy: Float?, val client_event_id: String?, val source: String = "MANUAL")
data class PodRequest(
    val job_id: String,
    val stop_id: String,
    val receiver_name: String,
    val receiver_phone: String?,
    val delivered_quantity: Int,
    val damaged_quantity: Int = 0,
    val shortage_quantity: Int = 0,
    val signature_url: String?,
    val photo_urls: List<String> = emptyList(),
    val latitude: Double?,
    val longitude: Double?,
    val client_event_id: String?
)

data class BatchGpsRequest(
    val driver_id: String,
    val job_id: String?,
    val points: List<GpsPointPayload>
)
data class GpsPointPayload(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float?,
    val speed: Float?,
    val bearing: Float?,
    val altitude: Double?,
    val is_mock: Boolean,
    val timestamp_device: String
)

interface FleetApiService {
    @POST("auth/login")
    suspend fun login(@Body req: LoginRequest): Response<LoginResponse>

    @PATCH("drivers/{id}/duty-status")
    suspend fun updateDutyStatus(
        @Path("id") driverId: String,
        @Body req: DutyStatusRequest
    ): Response<Any>

    @POST("jobs/{id}/accept")
    suspend fun acceptJob(@Path("id") jobId: String, @Body req: AcceptJobRequest): Response<Any>

    @POST("jobs/{id}/reject")
    suspend fun rejectJob(@Path("id") jobId: String, @Body req: RejectJobRequest): Response<Any>

    @POST("jobs/{id}/start")
    suspend fun startJob(@Path("id") jobId: String): Response<Any>

    @POST("jobs/{id}/complete")
    suspend fun completeJob(@Path("id") jobId: String): Response<Any>

    @POST("jobs/stops/{id}/arrive")
    suspend fun arriveAtStop(@Path("id") stopId: String, @Body req: StopArrivalRequest): Response<Any>

    @POST("jobs/stops/{id}/start-operation")
    suspend fun startStopOperation(@Path("id") stopId: String): Response<Any>

    @POST("jobs/stops/{id}/complete-operation")
    suspend fun completeStopOperation(@Path("id") stopId: String): Response<Any>

    @POST("pod")
    suspend fun submitPod(@Body req: PodRequest): Response<Any>

    @POST("gps/batch")
    suspend fun uploadGpsBatch(@Body req: BatchGpsRequest): Response<Any>
}
