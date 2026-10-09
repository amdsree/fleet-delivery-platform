# ProGuard / R8 Rules for Roditte Fleet Management
# Enterprise Anti-Tampering, Code Obfuscation & Resource Optimization

# Keep Jetpack Compose
-keepclassmembers class * {
    @androidx.compose.runtime.Composable *;
}
-dontwarn androidx.compose.**

# Keep Data Models and Serialization
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

-keep class com.fleet.delivery.data.remote.** { *; }
-keep class com.fleet.delivery.data.local.** { *; }
-keep class com.fleet.delivery.ui.screens.**$* { *; }

# Retrofit 2
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }
-keepattributes Signature
-keepattributes Exceptions
-keepclasseswithmembers class * {
    @retrofit2.http.* <methods>;
}

# OkHttp 3
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }

# Gson Rules
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
    @com.google.gson.annotations.Expose <fields>;
}
-keep class com.google.gson.** { *; }

# AndroidX Room
-keep class * extends androidx.room.RoomDatabase
-dontwarn androidx.room.paging.**

# WorkManager
-keep class * extends androidx.work.Worker { *; }
-keep class * extends androidx.work.ListenableWorker { *; }

# Anti-Tampering & Security Integrity Engine
-keep class com.fleet.delivery.util.SecurityIntegrityChecker { *; }
-keep class com.fleet.delivery.util.SecurityIntegrityChecker$* { *; }

# Strip verbose and debug logging in release
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
}
