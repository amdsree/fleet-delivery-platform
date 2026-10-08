package com.fleet.delivery

import android.app.Application
import androidx.work.*
import com.fleet.delivery.util.FleetNotificationManager
import com.fleet.delivery.worker.OfflineSyncWorker
import java.util.concurrent.TimeUnit

class FleetApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        FleetNotificationManager.initNotificationChannel(this)
        setupBackgroundSyncWorker()
    }

    private fun setupBackgroundSyncWorker() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val syncWorkRequest = PeriodicWorkRequestBuilder<OfflineSyncWorker>(15, TimeUnit.MINUTES)
            .setConstraints(constraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "fleet_background_sync",
            ExistingPeriodicWorkPolicy.KEEP,
            syncWorkRequest
        )
    }
}
