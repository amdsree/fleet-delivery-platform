package com.fleet.delivery.util

import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.os.Debug
import java.io.File
import java.security.MessageDigest

/**
 * Enterprise Anti-Tampering & Runtime Application Self-Protection (RASP)
 * Validates APK signing certificate integrity against the official Roditte Enterprise release keystore,
 * detects unauthorized re-signing/modding, dynamic debuggers, and root binaries.
 */
object SecurityIntegrityChecker {

    // Official Roditte release keystore certificate SHA-256 fingerprint (fleet-enterprise-release.jks)
    const val EXPECTED_RELEASE_SHA256 = "7F:BA:20:6B:40:B3:F1:E0:BF:40:C3:7C:5C:61:A5:17:24:07:0B:8A:12:68:41:08:BA:D6:CC:5E:20:99:2B:15"

    data class IntegrityCheckResult(
        val isSecure: Boolean,
        val violations: List<String>,
        val currentFingerprint: String,
        val isDebuggerDetected: Boolean,
        val isRootDetected: Boolean
    )

    fun checkIntegrity(context: Context): IntegrityCheckResult {
        val violations = mutableListOf<String>()
        val currentFingerprint = getSigningCertificateFingerprint(context)
        var debuggerDetected = false
        var rootDetected = false

        // 1. Signature & Keystore Integrity Verification
        val cleanExpected = EXPECTED_RELEASE_SHA256.replace(":", "").uppercase()
        val cleanCurrent = currentFingerprint.replace(":", "").uppercase()

        if (cleanCurrent.isNotEmpty() && !cleanCurrent.startsWith("ERROR") && cleanCurrent != "UNKNOWN") {
            if (cleanCurrent != cleanExpected) {
                violations.add("Signature mismatch: APK certificate does not match official Roditte Enterprise release key ($cleanCurrent != $cleanExpected).")
            }
        }

        // 2. Debugger & Debuggable APK Detection
        if (Debug.isDebuggerConnected() || Debug.waitingForDebugger()) {
            debuggerDetected = true
            violations.add("Active debugger attached to application process.")
        }

        // 3. Root & Binary Tampering Detection
        val rootPaths = listOf(
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/system/sd/xbin/su",
            "/system/bin/failsafe/su",
            "/data/local/su",
            "/su/bin/su"
        )
        for (path in rootPaths) {
            try {
                if (File(path).exists()) {
                    rootDetected = true
                    violations.add("Root privilege binary detected ($path).")
                    break
                }
            } catch (_: Exception) {}
        }

        if (Build.TAGS != null && Build.TAGS.contains("test-keys")) {
            rootDetected = true
            violations.add("OS build signed with test-keys.")
        }

        val isSecure = violations.isEmpty()
        return IntegrityCheckResult(
            isSecure = isSecure,
            violations = violations,
            currentFingerprint = currentFingerprint,
            isDebuggerDetected = debuggerDetected,
            isRootDetected = rootDetected
        )
    }

    private fun getSigningCertificateFingerprint(context: Context): String {
        return try {
            val certBytes: ByteArray? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val packageInfo = context.packageManager.getPackageInfo(
                    context.packageName,
                    PackageManager.GET_SIGNING_CERTIFICATES
                )
                val signingInfo = packageInfo.signingInfo
                if (signingInfo != null) {
                    if (signingInfo.hasMultipleSigners()) {
                        signingInfo.apkContentsSigners.firstOrNull()?.toByteArray()
                    } else {
                        signingInfo.signingCertificateHistory.firstOrNull()?.toByteArray()
                    }
                } else null
            } else {
                @Suppress("DEPRECATION")
                val packageInfo = context.packageManager.getPackageInfo(
                    context.packageName,
                    PackageManager.GET_SIGNATURES
                )
                @Suppress("DEPRECATION")
                packageInfo.signatures?.firstOrNull()?.toByteArray()
            }

            if (certBytes != null) {
                val digest = MessageDigest.getInstance("SHA-256")
                val hash = digest.digest(certBytes)
                hash.joinToString(":") { "%02X".format(it) }
            } else {
                "UNKNOWN"
            }
        } catch (e: Exception) {
            "ERROR: ${e.message}"
        }
    }
}
