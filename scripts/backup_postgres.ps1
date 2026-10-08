param (
    [string]$BackupDir = "C:\Users\Sreejith BS\.gemini\antigravity\scratch\fleet-delivery-platform\backups",
    [int]$RetentionDays = 14
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
}

$Timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
$BackupFile = Join-Path $BackupDir "fleet_backup_$Timestamp.sql.gz"

Write-Host "--- Initiating Fleet PostgreSQL Backup [$Timestamp] ---"

# Execute pg_dump from Docker container
try {
    docker exec -t fleet_postgres pg_dump -U postgres -d fleet_delivery_db | gzip > $BackupFile
    Write-Host "Backup successfully created: $BackupFile"

    # Verify backup size
    $FileSize = (Get-Item $BackupFile).Length
    if ($FileSize -lt 1024) {
        Write-Warning "Backup file is unusually small ($FileSize bytes). Verification recommended!"
    } else {
        Write-Host "Backup file size verified: [$(Math::Round($FileSize / 1KB, 2)) KB]"
    }

    # Enforce retention policy
    $CutoffDate = (Get-Date).AddDays(-$RetentionDays)
    Get-ChildItem -Path $BackupDir -Filter "fleet_backup_*.sql.gz" | Where-Object { $_.CreationTime -lt $CutoffDate } | ForEach-Object {
        Write-Host "Purging expired backup archive: $($_.FullName)"
        Remove-Item $_.FullName -Force
    }

    Write-Host "--- Backup & Retention Routine Finished Successfully ---"
} catch {
    Write-Error "Backup routine failed: $_"
}
