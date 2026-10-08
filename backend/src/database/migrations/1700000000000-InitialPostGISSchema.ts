import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialPostGISSchema1700000000000 implements MigrationInterface {
  name = 'InitialPostGISSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Enable PostGIS and UUID Extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);

    // 2. Create Enums
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE role_name_enum AS ENUM ('ADMIN', 'SALES_STAFF', 'GODOWN_MANAGER', 'DRIVER');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE user_status_enum AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE driver_duty_status_enum AS ENUM (
          'OFF_DUTY', 'AVAILABLE', 'JOB_OFFERED', 'BUSY', 'AT_PICKUP', 
          'LOADING', 'IN_TRANSIT', 'AT_DELIVERY', 'UNLOADING', 'RETURNING', 
          'BREAK', 'SUSPENDED', 'OFFLINE'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE vehicle_status_enum AS ENUM ('AVAILABLE', 'ASSIGNED', 'IN_TRIP', 'MAINTENANCE', 'INACTIVE');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE location_type_enum AS ENUM ('VENDOR', 'CUSTOMER', 'GODOWN', 'OTHER');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE order_status_enum AS ENUM (
          'DRAFT', 'SUBMITTED', 'RECEIVED', 'DISPATCH_PENDING', 'ASSIGNED', 
          'IN_PROGRESS', 'PARTIALLY_COMPLETED', 'COMPLETED', 'FAILED', 'CANCELLED'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE job_type_enum AS ENUM ('PICKUP', 'DELIVERY', 'TRANSFER', 'RETURN');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE job_status_enum AS ENUM (
          'DRAFT', 'OFFERED', 'ASSIGNED', 'ACCEPTED', 'STARTED', 
          'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FAILED', 'REJECTED', 'EXPIRED'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE stop_type_enum AS ENUM ('PICKUP', 'DELIVERY', 'GODOWN', 'RETURN');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE stop_status_enum AS ENUM ('PENDING', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE job_reject_reason_enum AS ENUM (
          'VEHICLE_CAPACITY', 'VEHICLE_UNAVAILABLE', 'DRIVER_UNAVAILABLE', 
          'ALREADY_COMMITTED', 'PERSONAL_REASON', 'OTHER'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // 3. Permissions & Roles
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        permission_code VARCHAR(100) UNIQUE NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name role_name_enum UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_id)
      );
    `);

    // 4. Users Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(150) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role_id UUID NOT NULL REFERENCES roles(id),
        status user_status_enum DEFAULT 'ACTIVE',
        employee_code VARCHAR(50) UNIQUE,
        profile_photo_url TEXT,
        fcm_token TEXT,
        token_version INT DEFAULT 0,
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    `);

    // 5. Drivers Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        license_number VARCHAR(50) UNIQUE NOT NULL,
        license_expiry DATE NOT NULL,
        emergency_contact VARCHAR(20),
        duty_status driver_duty_status_enum DEFAULT 'OFFLINE',
        current_location GEOGRAPHY(Point, 4326),
        current_latitude NUMERIC(10, 7),
        current_longitude NUMERIC(10, 7),
        current_accuracy REAL,
        current_speed REAL,
        current_bearing REAL,
        last_gps_at TIMESTAMPTZ,
        last_heartbeat_at TIMESTAMPTZ,
        consecutive_rejections INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_drivers_duty_status ON drivers(duty_status);
      CREATE INDEX IF NOT EXISTS idx_drivers_current_location ON drivers USING GIST(current_location);
    `);

    // 6. Vehicles Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        registration_number VARCHAR(50) UNIQUE NOT NULL,
        vehicle_type VARCHAR(50) NOT NULL,
        manufacturer VARCHAR(50) NOT NULL,
        model VARCHAR(50) NOT NULL,
        year INT,
        fuel_type VARCHAR(30) DEFAULT 'DIESEL',
        payload_capacity_kg NUMERIC(10, 2) NOT NULL,
        volume_capacity_m3 NUMERIC(10, 2) NOT NULL,
        status vehicle_status_enum DEFAULT 'AVAILABLE',
        current_driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
        current_latitude NUMERIC(10, 7),
        current_longitude NUMERIC(10, 7),
        insurance_expiry DATE,
        fitness_expiry DATE,
        pollution_expiry DATE,
        permit_expiry DATE,
        service_due_km INT,
        current_odometer INT DEFAULT 0,
        remarks JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
      CREATE INDEX IF NOT EXISTS idx_vehicles_current_driver ON vehicles(current_driver_id);
    `);

    // 7. Locations Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(150) NOT NULL,
        type location_type_enum DEFAULT 'CUSTOMER',
        address TEXT NOT NULL,
        contact_person VARCHAR(100),
        phone VARCHAR(20),
        coordinates GEOGRAPHY(Point, 4326),
        latitude NUMERIC(10, 7) NOT NULL,
        longitude NUMERIC(10, 7) NOT NULL,
        geofence_radius_meters INT DEFAULT 100,
        remarks TEXT,
        active BOOLEAN DEFAULT TRUE,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_locations_coordinates ON locations USING GIST(coordinates);
      CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(type);
      CREATE INDEX IF NOT EXISTS idx_locations_active ON locations(active);
    `);

    // 8. Orders Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_number VARCHAR(50) UNIQUE NOT NULL,
        created_by UUID NOT NULL REFERENCES users(id),
        sales_staff_id UUID NOT NULL REFERENCES users(id),
        pickup_location_id UUID NOT NULL REFERENCES locations(id),
        delivery_location_id UUID NOT NULL REFERENCES locations(id),
        priority INT DEFAULT 2,
        order_status order_status_enum DEFAULT 'DRAFT',
        total_weight_kg NUMERIC(10, 2) DEFAULT 0,
        total_volume_m3 NUMERIC(10, 3) DEFAULT 0,
        total_quantity INT DEFAULT 0,
        requested_pickup_time TIMESTAMPTZ,
        requested_delivery_time TIMESTAMPTZ,
        remarks TEXT,
        current_version INT DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
      CREATE INDEX IF NOT EXISTS idx_orders_sales_staff ON orders(sales_staff_id);
      CREATE INDEX IF NOT EXISTS idx_orders_priority ON orders(priority);
    `);

    // 9. Order Items Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_name VARCHAR(150) NOT NULL,
        sku VARCHAR(100),
        quantity INT NOT NULL,
        unit VARCHAR(30) DEFAULT 'PCS',
        weight_kg NUMERIC(10, 2) DEFAULT 0,
        volume_m3 NUMERIC(10, 3) DEFAULT 0,
        remarks TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    `);

    // 10. Order Versions Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS order_versions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        version INT NOT NULL,
        snapshot JSONB NOT NULL,
        change_reason TEXT,
        changed_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_order_versions_order_id ON order_versions(order_id);
    `);

    // 11. Jobs Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        job_number VARCHAR(50) UNIQUE NOT NULL,
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        job_type job_type_enum DEFAULT 'DELIVERY',
        status job_status_enum DEFAULT 'DRAFT',
        priority INT DEFAULT 2,
        assigned_driver_id UUID REFERENCES drivers(id),
        assigned_vehicle_id UUID REFERENCES vehicles(id),
        assigned_by UUID REFERENCES users(id),
        offered_at TIMESTAMPTZ,
        offer_expires_at TIMESTAMPTZ,
        accepted_at TIMESTAMPTZ,
        rejected_at TIMESTAMPTZ,
        rejection_reason job_reject_reason_enum,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        cancelled_at TIMESTAMPTZ,
        estimated_distance_km NUMERIC(10, 2) DEFAULT 0,
        actual_distance_km NUMERIC(10, 2) DEFAULT 0,
        estimated_duration_mins INT DEFAULT 0,
        actual_duration_mins INT DEFAULT 0,
        version INT DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
      CREATE INDEX IF NOT EXISTS idx_jobs_assigned_driver ON jobs(assigned_driver_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_assigned_vehicle ON jobs(assigned_vehicle_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_order_id ON jobs(order_id);
    `);

    // 12. Job Stops Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS job_stops (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        sequence_number INT NOT NULL,
        location_id UUID NOT NULL REFERENCES locations(id),
        stop_type stop_type_enum DEFAULT 'DELIVERY',
        status stop_status_enum DEFAULT 'PENDING',
        scheduled_time TIMESTAMPTZ,
        gps_auto_arrived_at TIMESTAMPTZ,
        driver_confirmed_arrived_at TIMESTAMPTZ,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        latitude_at_arrival NUMERIC(10, 7),
        longitude_at_arrival NUMERIC(10, 7),
        gps_accuracy_at_arrival REAL,
        remarks TEXT,
        client_event_id VARCHAR(100) UNIQUE
      );
      CREATE INDEX IF NOT EXISTS idx_job_stops_job_id ON job_stops(job_id);
      CREATE INDEX IF NOT EXISTS idx_job_stops_status ON job_stops(status);
    `);

    // 13. Proof of Deliveries Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS proof_of_deliveries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        stop_id UUID UNIQUE NOT NULL REFERENCES job_stops(id) ON DELETE CASCADE,
        receiver_name VARCHAR(150) NOT NULL,
        receiver_phone VARCHAR(20),
        delivered_quantity INT DEFAULT 0,
        damaged_quantity INT DEFAULT 0,
        shortage_quantity INT DEFAULT 0,
        signature_url TEXT,
        photo_urls JSONB DEFAULT '[]'::jsonb,
        remarks TEXT,
        latitude NUMERIC(10, 7),
        longitude NUMERIC(10, 7),
        accuracy REAL,
        captured_at TIMESTAMPTZ NOT NULL,
        created_by UUID REFERENCES users(id),
        client_event_id VARCHAR(100) UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_pod_job_id ON proof_of_deliveries(job_id);
    `);

    // 14. Trips Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS trips (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        job_id UUID UNIQUE NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        driver_id UUID NOT NULL REFERENCES drivers(id),
        vehicle_id UUID NOT NULL REFERENCES vehicles(id),
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ,
        start_latitude NUMERIC(10, 7),
        start_longitude NUMERIC(10, 7),
        end_latitude NUMERIC(10, 7),
        end_longitude NUMERIC(10, 7),
        raw_distance_km NUMERIC(10, 2) DEFAULT 0,
        validated_distance_km NUMERIC(10, 2) DEFAULT 0,
        driving_duration_mins INT DEFAULT 0,
        waiting_duration_mins INT DEFAULT 0,
        pickup_duration_mins INT DEFAULT 0,
        delivery_duration_mins INT DEFAULT 0,
        return_duration_mins INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id);
      CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id ON trips(vehicle_id);
    `);

    // 15. GPS Telemetry Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS gps_telemetry (
        id BIGSERIAL PRIMARY KEY,
        driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
        vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
        location GEOGRAPHY(Point, 4326),
        latitude NUMERIC(10, 7) NOT NULL,
        longitude NUMERIC(10, 7) NOT NULL,
        accuracy REAL,
        altitude REAL,
        speed REAL,
        bearing REAL,
        battery_level INT,
        network_type VARCHAR(30),
        is_mock BOOLEAN DEFAULT FALSE,
        provider VARCHAR(50),
        sequence_number BIGINT,
        timestamp_device TIMESTAMPTZ NOT NULL,
        timestamp_server TIMESTAMPTZ DEFAULT NOW(),
        is_filtered BOOLEAN DEFAULT FALSE
      );
      CREATE INDEX IF NOT EXISTS idx_gps_driver_id ON gps_telemetry(driver_id);
      CREATE INDEX IF NOT EXISTS idx_gps_job_id ON gps_telemetry(job_id);
      CREATE INDEX IF NOT EXISTS idx_gps_location ON gps_telemetry USING GIST(location);
      CREATE INDEX IF NOT EXISTS idx_gps_timestamp_device ON gps_telemetry(timestamp_device);
    `);

    // 16. Audit Logs Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id),
        user_role VARCHAR(50),
        action VARCHAR(100) NOT NULL,
        entity_name VARCHAR(100) NOT NULL,
        entity_id VARCHAR(100),
        old_values JSONB,
        new_values JSONB,
        ip_address VARCHAR(50),
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_name, entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
    `);

    // 17. Notifications, Idempotency & System Settings Tables
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        payload JSONB,
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

      CREATE TABLE IF NOT EXISTS idempotency_records (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_event_id VARCHAR(120) UNIQUE NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(100),
        response_payload JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT NOT NULL,
        value_type VARCHAR(50) DEFAULT 'STRING',
        description TEXT
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS system_settings CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS idempotency_records CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS notifications CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS gps_telemetry CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS trips CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS proof_of_deliveries CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS job_stops CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS jobs CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS order_versions CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS order_items CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS orders CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS locations CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS vehicles CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS drivers CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS role_permissions CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS roles CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS permissions CASCADE;`);
  }
}
