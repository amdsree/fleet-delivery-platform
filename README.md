# Enterprise Android Fleet & Delivery Management Platform

A production-grade, distributed logistics orchestration, driver management, dispatch optimization, vehicle management, GPS tracking, and delivery management platform.

---

## 1. System Architecture

```
[ Android Driver & Staff Clients ] <---> [ Reverse Proxy / Gateway ]
                                                |
                +-------------------------------+-------------------------------+
                |                                                               |
    [ NestJS REST Cluster ]                                         [ Socket.io Realtime Gateway ]
    - Auth & RBAC Guards                                            - Live Driver Coordinates
    - Orders & Versioning                                           - Urgent Dispatch Alerts
    - PostGIS Dispatch Engine                                       - Stop State Broadcasting
    - Proof of Delivery (POD)                                                   |
                |                                                               |
    +-----------+-----------+                                                   |
    |                       |                                                   |
[ PostgreSQL 16 + PostGIS ]  [ Redis 7 Cluster ] <-------------------------------+
- Relational Entities       - High-speed Ingestion Buffer
- Spatial GiST Indexes      - Redlock Concurrency Locks
- Immutable Audit Logs      - Token Revocation Blacklist
```

---

## 2. Platform Components

1. **Backend Cluster (`backend/`)**:
   - **Framework:** NestJS (Node.js + TypeScript)
   - **Database:** PostgreSQL 16 with PostGIS 3.4 spatial extensions
   - **Realtime:** Socket.io WebSocket Gateway (`/realtime`)
   - **Cache & Locks:** Redis 7 with Redlock distributed locking
   - **ORM & Migrations:** TypeORM with PostGIS geometry/geography types
   - **Security:** Argon2id / bcrypt password hashing, JWT Access + Refresh rotation, fine-grained RBAC guards (`@RequirePermissions`)

2. **Admin Web Dashboard (`admin-web/`)**:
   - **Framework:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS
   - **Live Map:** Interactive Leaflet / OpenStreetMap visualizer with live WebSocket vehicle markers and geofences
   - **Modules:** KPI Dashboard, Dispatch Queue, Order Management, Driver Roster, Vehicle Registry, Audit Trails, and CSV Export Center

3. **Android Application (`android/`)**:
   - **Language & UI:** Kotlin, Jetpack Compose, Material3
   - **Location:** Android Foreground Service with persistent notification and `FusedLocationProviderClient`
   - **Offline Engine:** Room SQLite Local Database with offline event queueing
   - **Background Sync:** WorkManager `CoroutineWorker` with exponential retry
   - **Hardware Features:** Digital Signature Touch Canvas (`SignaturePad`) & Camera POD capture

---

## 3. Quick Start (Local Development)

### Prerequisites
- Node.js >= 20.x
- Docker & Docker Compose
- Android Studio Ladybug / Koala (for Android client build)

### Step 1: Start Infrastructure Containers
```bash
# Start PostgreSQL (PostGIS), Redis, MinIO object storage
docker compose up -d postgres redis minio
```

### Step 2: Configure Environment
```bash
cp .env.example .env
```

### Step 3: Run Database Migrations & Seed Data
```bash
cd backend
npm install
npm run migration:run
npm run seed
```
> **Default Seed Accounts:**
> - **SuperAdmin:** `admin@fleetplatform.com` | `Admin@12345`
> - **Godown Manager:** `godown@fleetplatform.com` | `Staff@12345`
> - **Sales Staff:** `sales@fleetplatform.com` | `Staff@12345`
> - **Driver 1:** `driver1@fleetplatform.com` | `Driver@12345`

### Step 4: Launch Applications
**Terminal 1 (Backend API):**
```bash
cd backend
npm run start:dev
# Running on http://localhost:4000/api/v1
# Swagger docs: http://localhost:4000/api/docs
```

**Terminal 2 (Admin Web Dashboard):**
```bash
cd admin-web
npm install
npm run dev
# Running on http://localhost:3000
```

---

## 4. Running Automated Tests

Run the full automated test suite covering the PostGIS dispatch algorithm, GPS noise filtering, velocity jump detection, and state machine transition rules:

```bash
cd backend
npm test
```

### Test Coverage Highlights:
- `dispatch.spec.ts`: Validates candidate ranking function, distance penalty, consecutive rejection penalty, and vehicle payload/volume capacity filtering.
- `gps-filter.spec.ts`: Validates accuracy cutoff (>100m points discarded), mock location detection, velocity jump filtering (>130 km/h), and stationary jitter reduction.
- `state-machine.spec.ts`: Validates legal state transitions (`AVAILABLE -> OFF_DUTY`) and verifies rejection of illegal jumps (`AVAILABLE -> UNLOADING`).

---

## 5. API Reference

All REST endpoints are prefixed with `/api/v1`. Interactive Swagger documentation is available at `/api/docs`.

### Authentication
- `POST /auth/login` - Authenticate via email/phone + password; returns access & refresh tokens
- `POST /auth/refresh` - Rotate refresh token
- `POST /auth/logout` - Revoke current token version
- `GET /auth/me` - Current authenticated user session & permissions

### Dispatch & Jobs
- `GET /jobs` - Query active/historical dispatch jobs
- `POST /jobs/auto-dispatch/:order_id` - Run dispatch engine ranking and offer to top driver
- `POST /jobs/:id/assign` - Manual driver & vehicle assignment with row locks
- `POST /jobs/:id/accept` - Driver accepts job offer with vehicle selection
- `POST /jobs/:id/reject` - Driver declines offer with mandatory rejection reason
- `POST /jobs/:id/start` - Driver starts transit; initializes `trips` record
- `POST /jobs/:id/complete` - Completes job & return leg; finalizes trip mileage

### Job Stops & Proof of Delivery (POD)
- `POST /jobs/stops/:id/arrive` - Record arrival (Manual or Geofence Auto)
- `POST /jobs/stops/:id/start-operation` - Begin loading/unloading
- `POST /jobs/stops/:id/complete-operation` - Advance stop along route
- `POST /pod` - Submit digital signature, receiver details, delivered/damaged quantities

### GPS Ingestion
- `POST /gps/batch` - Batch upload of device GPS fixes (Kalman/Dead reckoning filtered)
- `POST /gps/heartbeat` - Periodic driver presence heartbeat

### Reports & Export
- `GET /reports/dashboard` - Operational KPI summary
- `GET /reports/drivers?format=csv` - Driver efficiency & validated mileage report
- `GET /reports/vehicles?format=csv` - Vehicle fleet utilization report

---

## 6. Android Implementation Architecture

The Android Driver application is organized around clean offline-first architecture:
- **Foreground Tracking Service:** [`LocationTrackingService.kt`](android/app/src/main/kotlin/com/fleet/delivery/service/LocationTrackingService.kt) uses `FOREGROUND_SERVICE_TYPE_LOCATION` with a persistent notification channel to comply with Android 10-15 background restrictions.
- **Offline Event Queueing:** [`LocalEntities.kt`](android/app/src/main/kotlin/com/fleet/delivery/data/local/LocalEntities.kt) buffers telemetry and operational events locally in Room SQLite with a UUID `client_event_id`.
- **WorkManager Sync:** [`OfflineSyncWorker.kt`](android/app/src/main/kotlin/com/fleet/delivery/worker/OfflineSyncWorker.kt) executes background uploads upon network reconnection with automatic retry.
- **Digital POD Signature:** [`SignaturePad.kt`](android/app/src/main/kotlin/com/fleet/delivery/ui/components/SignaturePad.kt) captures vector touch signatures on the device without requiring internet connectivity.
- **Driver Safety:** [`DriverHomeScreen.kt`](android/app/src/main/kotlin/com/fleet/delivery/ui/screens/DriverHomeScreen.kt) detects vehicle velocity and presents an active motion warning (*"Vehicle in Motion. Drive safely. Pull over before interacting."*).

---

## 7. Disaster Recovery & Database Backup Strategy

Run the automated backup and retention script:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/backup_postgres.ps1
```
- Performs atomic compressed database dumps (`.sql.gz`)
- Validates backup integrity and file size
- Automatically enforces the 14-day archival retention policy
