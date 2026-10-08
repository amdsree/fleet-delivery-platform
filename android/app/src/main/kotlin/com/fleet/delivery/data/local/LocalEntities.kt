package com.fleet.delivery.data.local

import androidx.room.*
import java.util.UUID

@Entity(tableName = "local_gps_points")
data class GpsPointEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val driverId: String,
    val jobId: String?,
    val vehicleId: String?,
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float?,
    val altitude: Double?,
    val speed: Float?,
    val bearing: Float?,
    val batteryLevel: Int?,
    val networkType: String?,
    val isMock: Boolean,
    val timestampDevice: String,
    val isSynced: Boolean = false
)

@Entity(tableName = "offline_sync_events")
data class SyncEventEntity(
    @PrimaryKey val clientEventId: String = UUID.randomUUID().toString(),
    val eventType: String, // ARRIVAL, LOADING_START, POD_SUBMIT, STOP_COMPLETE
    val entityId: String,
    val payloadJson: String,
    val status: String = "PENDING", // PENDING, SYNCING, SYNCED, FAILED
    val retryCount: Int = 0,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "cached_jobs")
data class CachedJobEntity(
    @PrimaryKey val id: String,
    val jobNumber: String,
    val status: String,
    val priority: Int,
    val pickupAddress: String,
    val deliveryAddress: String,
    val totalWeightKg: Double,
    val totalVolumeM3: Double,
    val rawJson: String,
    val updatedAt: Long = System.currentTimeMillis()
)

@Dao
interface GpsDao {
    @Insert
    suspend fun insertPoint(point: GpsPointEntity): Long

    @Query("SELECT * FROM local_gps_points WHERE isSynced = 0 ORDER BY timestampDevice ASC LIMIT :limit")
    suspend fun getUnsyncedPoints(limit: Int = 100): List<GpsPointEntity>

    @Query("UPDATE local_gps_points SET isSynced = 1 WHERE id IN (:ids)")
    suspend fun markAsSynced(ids: List<Long>)

    @Query("DELETE FROM local_gps_points WHERE isSynced = 1")
    suspend fun clearSyncedPoints()
}

@Dao
interface SyncEventDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun recordEvent(event: SyncEventEntity)

    @Query("SELECT * FROM offline_sync_events WHERE status = 'PENDING' ORDER BY createdAt ASC")
    suspend fun getPendingEvents(): List<SyncEventEntity>

    @Query("UPDATE offline_sync_events SET status = :status, retryCount = retryCount + 1 WHERE clientEventId = :eventId")
    suspend fun updateEventStatus(eventId: String, status: String)

    @Query("DELETE FROM offline_sync_events WHERE status = 'SYNCED'")
    suspend fun clearCompletedEvents()
}

@Dao
interface JobDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun cacheJob(job: CachedJobEntity)

    @Query("SELECT * FROM cached_jobs LIMIT 1")
    suspend fun getActiveJob(): CachedJobEntity?

    @Query("DELETE FROM cached_jobs")
    suspend fun clearJobs()
}

@Database(
    entities = [GpsPointEntity::class, SyncEventEntity::class, CachedJobEntity::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun gpsDao(): GpsDao
    abstract fun syncEventDao(): SyncEventDao
    abstract fun jobDao(): JobDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: android.content.Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "fleet_local_offline.db"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
