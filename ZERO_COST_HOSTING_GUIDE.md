# Complete Online Hosting Guide: Zero-Cost ($0/month) Cloud Setup

This guide provides the complete, production-grade instructions to host the entire **Fleet & Delivery Management Platform** online with **100% zero monthly infrastructure costs** using tier-one cloud free tiers.

---

## 1. Cloud Architecture Overview

```
                      +------------------------------------------+
                      |         SUPERVISORS & CUSTOMERS          |
                      |   Admin Web Dashboard (Next.js 14)       |
                      |   Hosted on: VERCEL (Free CDN + SSL)     |
                      |   URL: https://fleet-admin.vercel.app    |
                      +--------------------+---------------------+
                                           |
                              HTTPS REST & | WSS WebSockets
                                           v
                      +------------------------------------------+
                      |           CORE FLEET ENGINE              |
                      |     NestJS API + Socket.IO Gateway       |
                      |     Hosted on: RENDER / KOYEB ($0/mo)    |
                      |     URL: https://fleet-api.onrender.com  |
                      +----------+--------------------+----------+
                                 |                    |
        PostGIS Spatial Queries  |                    | Ingestion & Locks
                                 v                    v
              +----------------------+   +-----------------------+
              |   SUPABASE POSTGRES  |   |    UPSTASH REDIS      |
              |   PostGIS 3.4 Spatial|   |    Serverless Redis   |
              |   500 MB Free Tier   |   |    10,000 cmds/day    |
              +----------------------+   +-----------------------+
                                 ^
                                 | HTTPS / WSS
                      +----------+--------------------+
                      |       FLEET DRIVERS (ANDROID) |
                      |    In-House Enterprise APK    |
                      |    Download: /download        |
                      |    Self-Updating via API      |
                      +-------------------------------+
```

### Free Tier Allocation Matrix

| Tier Component | Cloud Provider | Free Tier Allocation | Responsibility in System |
| :--- | :--- | :--- | :--- |
| **Spatial Database** | [Supabase](https://supabase.com) | 500 MB Postgres + Native PostGIS 3.4 + 50k users | Roles, Users, Orders, Jobs, Geofences, PODs, Audit Logs |
| **Ingestion & Locks** | [Upstash](https://upstash.com) | 10,000 commands/day + 256 MB memory | GPS point buffering, Dispatch candidate mutex locks |
| **Backend & WebSockets**| [Render](https://render.com) | 750 free hours/month + Automated SSL (`https://...`) | REST APIs, Socket.IO real-time stream, APK distribution |
| **Web Dashboard** | [Vercel](https://vercel.com) | Unlimited edge builds + Global CDN + Automated SSL | Admin & Godown Manager UI, Analytics, Download portal |
| **Driver Handhelds** | Direct In-House | Unlimited Devices | Android APK distributed via web portal QR code |

---

## 2. Step 1: Provision Free PostGIS Database on Supabase

1. Go to [supabase.com](https://supabase.com) and click **Start your project** (Free).
2. Create an organization and name your project `fleet-logistics`.
3. Set a strong database password (save this password).
4. Select your preferred AWS region (e.g. `ap-south-1` Mumbai or `eu-central-1` Frankfurt).
5. Once provisioned (~2 minutes), open the **SQL Editor** tab from the left sidebar and run:
   ```sql
   -- Enable PostGIS spatial calculations
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
6. Navigate to **Project Settings** &rarr; **Database** &rarr; **Connection string** &rarr; **URI**.
7. Copy the Connection URI. It looks like:
   ```
   postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

---

## 3. Step 2: Provision Free Serverless Redis on Upstash

1. Go to [upstash.com](https://upstash.com) and sign in (Free).
2. Click **Create Database**.
3. Name: `fleet-redis`.
4. Region: Choose the region nearest to your Supabase region.
5. In the database dashboard, locate the **Node.js / ioredis** or **General** connection details:
   - **Host**: `[ENDPOINT].upstash.io`
   - **Port**: `6379`
   - **Password**: `[YOUR_PASSWORD]`
   - **TLS**: `true` (Enabled by default)

---

## 4. Step 3: Deploy Backend & WebSockets on Render

The repository contains a pre-configured [`render.yaml`](./render.yaml) blueprint.

### Option A: 1-Click Blueprint Deploy (Recommended)
1. Push your project to your GitHub account:
   ```powershell
   git remote add origin https://github.com/<your-username>/fleet-delivery-platform.git
   git push -u origin master
   ```
2. Log in to [render.com](https://render.com).
3. Click **Blueprints** &rarr; **New Blueprint Instance**.
4. Select your GitHub repository.
5. Render reads `render.yaml` automatically and prompts for the connection variables.

### Option B: Manual Web Service Setup
1. On Render, click **New +** &rarr; **Web Service**.
2. Connect your GitHub repository.
3. Configure the settings:
   - **Name**: `fleet-backend-api`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
   - **Instance Type**: `Free ($0/month)`
4. In **Environment Variables**, paste:
   ```env
   NODE_ENV=production
   PORT=10000
   DB_TYPE=postgres
   DB_HOST=aws-0-[REGION].pooler.supabase.com
   DB_PORT=6543
   DB_USERNAME=postgres.[PROJECT_REF]
   DB_PASSWORD=[YOUR_SUPABASE_PASSWORD]
   DB_NAME=postgres
   DB_SSL=true
   REDIS_HOST=[YOUR_UPSTASH_ENDPOINT].upstash.io
   REDIS_PORT=6379
   REDIS_PASSWORD=[YOUR_UPSTASH_PASSWORD]
   REDIS_TLS=true
   JWT_SECRET=super-secret-production-jwt-key-2026
   JWT_REFRESH_SECRET=super-secret-production-refresh-key-2026
   ADMIN_EMAIL=admin@fleetplatform.com
   ADMIN_PASSWORD=Admin@12345
   ```
5. Click **Create Web Service**.
6. When deployment finishes, Render gives you a live public HTTPS address:
   `https://fleet-backend-api-xxxx.onrender.com`

---

## 5. Step 4: Deploy Web Management Dashboard on Vercel

1. Log in to [vercel.com](https://vercel.com) using your GitHub account.
2. Click **Add New...** &rarr; **Project** and import your repository.
3. Configure the project:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click edit and select `admin-web`
4. Under **Environment Variables**, add:
   ```env
   NEXT_PUBLIC_API_URL=https://fleet-backend-api-xxxx.onrender.com/api/v1
   NEXT_PUBLIC_SOCKET_URL=https://fleet-backend-api-xxxx.onrender.com
   ```
5. Click **Deploy**.
6. Within 90 seconds, Vercel gives you an enterprise CDN HTTPS domain:
   `https://fleet-admin-xxxx.vercel.app`

---

## 6. Step 5: Distribute Android App to Drivers & Managers

### In-House Distribution Portal
1. The web dashboard includes a built-in download portal at:
   `https://fleet-admin-xxxx.vercel.app/download`
2. Drivers or Godown staff can:
   - Scan the on-screen QR code using any smartphone camera.
   - Tap **Download APK (v1.0.0)** to install directly on their devices.
3. The APK includes enterprise self-update logic:
   - When a new version is released, the app checks `GET /distribution/latest-version` and prompts the driver to update seamlessly.

### Connecting App to Your Live Cloud API
To point the app to your live Render backend before generating new APKs:
1. Open `android/app/src/main/kotlin/com/fleet/delivery/data/remote/ApiClient.kt`:
   ```kotlin
   const val BASE_URL = "https://fleet-backend-api-xxxx.onrender.com/api/v1/"
   ```
2. Build the signed release APK:
   ```powershell
   cd android
   $env:JAVA_HOME = "C:\Users\Sreejith BS\.gemini\antigravity\scratch\tools\jdk17"
   & "C:\Users\Sreejith BS\.gemini\antigravity\scratch\tools\gradle\bin\gradle.bat" assembleRelease
   ```
3. Copy the output APK to the web downloads folder:
   ```powershell
   Copy-Item "app/build/outputs/apk/release/app-release.apk" "../backend/public/downloads/fleet-driver.apk" -Force
   Copy-Item "app/build/outputs/apk/release/app-release.apk" "../admin-web/public/downloads/fleet-driver.apk" -Force
   ```

---

## 7. Alternative: 100% Free Dedicated Cloud VM (Oracle Cloud Always Free)

If you prefer hosting the entire stack on your own dedicated cloud virtual machine without using 3rd-party SaaS:

- **Oracle Cloud Always Free Tier** provides:
  - **4 Ampere A1 ARM CPU cores**
  - **24 GB RAM**
  - **200 GB SSD storage**
  - Completely free forever with no expiration.
- Deploy in 2 commands using the included [`docker-compose.yml`](./docker-compose.yml):
  ```bash
  git clone https://github.com/<your-username>/fleet-delivery-platform.git
  cd fleet-delivery-platform
  docker compose up -d
  ```
- All 5 services (PostGIS 16, Redis 7, MinIO S3, NestJS Backend, Next.js Web) will run on your VM simultaneously.

---

## 8. Instant 30-Second Live Public Internet Demo (No Signup Required)

If you want to immediately expose this workstation to the public internet right now without signing up for any cloud providers:

1. Run the included tunnel script:
   ```powershell
   cd "C:\Users\Sreejith BS\.gemini\antigravity\scratch\fleet-delivery-platform"
   .\scripts\start-live-tunnel.ps1
   ```
2. The script launches secure HTTPS tunnels and gives you live URLs:
   - **Backend API Live**: `https://<random-id>.loca.lt`
   - **Web Dashboard Live**: `https://<random-id>.loca.lt`
3. You can open that URL on any mobile device or computer worldwide immediately!
