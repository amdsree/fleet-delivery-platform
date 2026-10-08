import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../data-source';
import {
  Role,
  Permission,
  User,
  Driver,
  Vehicle,
  Location,
  Order,
  OrderItem,
  Job,
  JobStop,
  SystemSetting,
} from '../entities';
import {
  RoleName,
  UserStatus,
  DriverDutyStatus,
  VehicleStatus,
  LocationType,
  OrderStatus,
  JobType,
  JobStatus,
  StopType,
  StopStatus,
  PermissionCode,
} from '../../common/enums';

export async function runSeed(dataSource: DataSource) {
  console.log('--- Starting Fleet System Seeding ---');

  const permRepo = dataSource.getRepository(Permission);
  const roleRepo = dataSource.getRepository(Role);
  const userRepo = dataSource.getRepository(User);
  const driverRepo = dataSource.getRepository(Driver);
  const vehicleRepo = dataSource.getRepository(Vehicle);
  const locationRepo = dataSource.getRepository(Location);
  const orderRepo = dataSource.getRepository(Order);
  const jobRepo = dataSource.getRepository(Job);
  const settingRepo = dataSource.getRepository(SystemSetting);

  // 1. Seed Permissions
  const permissionsList = Object.values(PermissionCode).map((code) => ({
    permission_code: code,
    description: `Grants ${code.toLowerCase().replace(/_/g, ' ')} authorization`,
  }));

  for (const p of permissionsList) {
    const existing = await permRepo.findOne({ where: { permission_code: p.permission_code } });
    if (!existing) {
      await permRepo.save(permRepo.create(p));
    }
  }
  const allPermissions = await permRepo.find();
  console.log(`Seeded ${allPermissions.length} permissions.`);

  // 2. Seed Roles & Map Permissions
  const roleDefinitions: { name: RoleName; description: string; permissions: string[] }[] = [
    {
      name: RoleName.ADMIN,
      description: 'System Administrator with full access',
      permissions: Object.values(PermissionCode),
    },
    {
      name: RoleName.GODOWN_MANAGER,
      description: 'Godown & Yard Dispatch Operations Manager',
      permissions: [
        PermissionCode.DRIVER_DUTY_TOGGLE,
        PermissionCode.VEHICLE_CREATE,
        PermissionCode.VEHICLE_UPDATE,
        PermissionCode.LOCATION_CREATE,
        PermissionCode.LOCATION_UPDATE,
        PermissionCode.ORDER_UPDATE,
        PermissionCode.ORDER_CANCEL,
        PermissionCode.JOB_DISPATCH,
        PermissionCode.JOB_REASSIGN,
        PermissionCode.GPS_VIEW_ALL,
        PermissionCode.GPS_VIEW_ASSIGNED,
        PermissionCode.REPORT_VIEW,
      ],
    },
    {
      name: RoleName.SALES_STAFF,
      description: 'Field & In-house Sales Representative',
      permissions: [
        PermissionCode.LOCATION_CREATE,
        PermissionCode.LOCATION_UPDATE,
        PermissionCode.ORDER_CREATE,
        PermissionCode.ORDER_UPDATE,
        PermissionCode.ORDER_CANCEL,
        PermissionCode.GPS_VIEW_ASSIGNED,
      ],
    },
    {
      name: RoleName.DRIVER,
      description: 'Delivery & Fleet Vehicle Driver',
      permissions: [
        PermissionCode.DRIVER_DUTY_TOGGLE,
        PermissionCode.JOB_ACCEPT_REJECT,
        PermissionCode.JOB_EXECUTE,
        PermissionCode.GPS_INGEST,
        PermissionCode.POD_UPLOAD,
      ],
    },
  ];

  for (const rDef of roleDefinitions) {
    let role = await roleRepo.findOne({ where: { name: rDef.name } });
    const perms = allPermissions.filter((p) => rDef.permissions.includes(p.permission_code as PermissionCode));
    if (!role) {
      role = roleRepo.create({
        name: rDef.name,
        description: rDef.description,
        permissions: perms,
      });
      await roleRepo.save(role);
    } else {
      role.permissions = perms;
      await roleRepo.save(role);
    }
  }

  const adminRole = await roleRepo.findOne({ where: { name: RoleName.ADMIN } });
  const godownRole = await roleRepo.findOne({ where: { name: RoleName.GODOWN_MANAGER } });
  const salesRole = await roleRepo.findOne({ where: { name: RoleName.SALES_STAFF } });
  const driverRole = await roleRepo.findOne({ where: { name: RoleName.DRIVER } });

  const defaultPassword = await bcrypt.hash('Admin@12345', 10);
  const staffPassword = await bcrypt.hash('Staff@12345', 10);
  const driverPassword = await bcrypt.hash('Driver@12345', 10);

  // 3. Seed Admin
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@fleetplatform.com';
  let adminUser = await userRepo.findOne({ where: { email: adminEmail } });
  if (!adminUser) {
    adminUser = userRepo.create({
      name: 'System SuperAdmin',
      email: adminEmail,
      phone: '+919876543210',
      password_hash: defaultPassword,
      role_id: adminRole.id,
      status: UserStatus.ACTIVE,
      employee_code: 'ADM-001',
    });
    await userRepo.save(adminUser);
    console.log(`Created admin account: ${adminEmail}`);
  }

  // 4. Seed Godown Manager & Sales Staff
  let godownUser = await userRepo.findOne({ where: { email: 'godown@fleetplatform.com' } });
  if (!godownUser) {
    godownUser = userRepo.create({
      name: 'Ramesh Nair (Godown Lead)',
      email: 'godown@fleetplatform.com',
      phone: '+919876543211',
      password_hash: staffPassword,
      role_id: godownRole.id,
      status: UserStatus.ACTIVE,
      employee_code: 'GDW-101',
    });
    await userRepo.save(godownUser);
  }

  let salesUser = await userRepo.findOne({ where: { email: 'sales@fleetplatform.com' } });
  if (!salesUser) {
    salesUser = userRepo.create({
      name: 'Ananya Sharma (Sales Exec)',
      email: 'sales@fleetplatform.com',
      phone: '+919876543212',
      password_hash: staffPassword,
      role_id: salesRole.id,
      status: UserStatus.ACTIVE,
      employee_code: 'SLS-201',
    });
    await userRepo.save(salesUser);
  }

  // 5. Seed Locations (Bangalore Center + Vendors + Customers)
  const seedLocations = [
    {
      name: 'Central Godown - Yeshwanthpur',
      type: LocationType.GODOWN,
      address: 'Plot 45, Industrial Suburb, Yeshwanthpur, Bengaluru, Karnataka 560022',
      contact_person: 'Ramesh Nair',
      phone: '+919876543211',
      latitude: 13.0285,
      longitude: 77.5408,
      geofence_radius_meters: 150,
      active: true,
      created_by: adminUser.id,
    },
    {
      name: 'Alpha Wholesale Vendor - Peenya',
      type: LocationType.VENDOR,
      address: '2nd Cross, Peenya Industrial Area Phase 1, Bengaluru 560058',
      contact_person: 'Mr. Jagdish',
      phone: '+919811122233',
      latitude: 13.0312,
      longitude: 77.5185,
      geofence_radius_meters: 120,
      active: true,
      created_by: adminUser.id,
    },
    {
      name: 'Beta Logistics Depot - Rajajinagar',
      type: LocationType.VENDOR,
      address: 'Dr Rajkumar Rd, Rajajinagar, Bengaluru 560010',
      contact_person: 'Suresh Babu',
      phone: '+919811122234',
      latitude: 12.9982,
      longitude: 77.553,
      geofence_radius_meters: 100,
      active: true,
      created_by: adminUser.id,
    },
    {
      name: 'Gamma Agro Produce - APMC Yard',
      type: LocationType.VENDOR,
      address: 'APMC Yard Gate 2, Yeshwanthpur, Bengaluru 560022',
      contact_person: 'Venkatesh Rao',
      phone: '+919811122235',
      latitude: 13.021,
      longitude: 77.545,
      geofence_radius_meters: 150,
      active: true,
      created_by: adminUser.id,
    },
    {
      name: 'Metro Hypermarket - Malleshwaram',
      type: LocationType.CUSTOMER,
      address: 'Sampige Road, Malleshwaram, Bengaluru 560003',
      contact_person: 'Deepak Store Manager',
      phone: '+919822233341',
      latitude: 13.0033,
      longitude: 77.5702,
      geofence_radius_meters: 100,
      active: true,
      created_by: adminUser.id,
    },
    {
      name: 'Reliance Super Store - Indiranagar',
      type: LocationType.CUSTOMER,
      address: '100 Feet Rd, Indiranagar, Bengaluru 560038',
      contact_person: 'Kavitha M',
      phone: '+919822233342',
      latitude: 12.9784,
      longitude: 77.6408,
      geofence_radius_meters: 100,
      active: true,
      created_by: adminUser.id,
    },
    {
      name: 'Star Retailers - Koramangala',
      type: LocationType.CUSTOMER,
      address: '80 Feet Rd, 4th Block, Koramangala, Bengaluru 560034',
      contact_person: 'Arjun Das',
      phone: '+919822233343',
      latitude: 12.9352,
      longitude: 77.6245,
      geofence_radius_meters: 100,
      active: true,
      created_by: adminUser.id,
    },
    {
      name: 'More Megastore - Jayanagar',
      type: LocationType.CUSTOMER,
      address: '9th Block, Jayanagar, Bengaluru 560069',
      contact_person: 'Sunil Gowda',
      phone: '+919822233344',
      latitude: 12.9237,
      longitude: 77.5947,
      geofence_radius_meters: 100,
      active: true,
      created_by: adminUser.id,
    },
    {
      name: 'Daily Fresh Mart - Whitefield',
      type: LocationType.CUSTOMER,
      address: 'ITPL Main Rd, Whitefield, Bengaluru 560066',
      contact_person: 'Pooja Reddy',
      phone: '+919822233345',
      latitude: 12.9863,
      longitude: 77.7337,
      geofence_radius_meters: 120,
      active: true,
      created_by: adminUser.id,
    },
  ];

  const savedLocations: Location[] = [];
  for (const loc of seedLocations) {
    let l = await locationRepo.findOne({ where: { name: loc.name } });
    if (!l) {
      l = locationRepo.create({
        ...loc,
        coordinates: {
          type: 'Point',
          coordinates: [loc.longitude, loc.latitude],
        } as any,
      });
      await locationRepo.save(l);
    }
    savedLocations.push(l);
  }
  console.log(`Seeded ${savedLocations.length} locations with PostGIS geofences.`);

  // 6. Seed 5 Drivers
  const driverData = [
    { name: 'Kiran Kumar', email: 'driver1@fleetplatform.com', phone: '+919900011001', lic: 'KA-04-2020-00192', lat: 13.028, lng: 77.541 },
    { name: 'Praveen Gowda', email: 'driver2@fleetplatform.com', phone: '+919900011002', lic: 'KA-04-2021-00284', lat: 13.015, lng: 77.552 },
    { name: 'Manjunath S', email: 'driver3@fleetplatform.com', phone: '+919900011003', lic: 'KA-04-2019-00341', lat: 12.985, lng: 77.591 },
    { name: 'Shiva Prasad', email: 'driver4@fleetplatform.com', phone: '+919900011004', lic: 'KA-04-2022-00412', lat: 12.965, lng: 77.612 },
    { name: 'Vijay Anand', email: 'driver5@fleetplatform.com', phone: '+919900011005', lic: 'KA-04-2023-00569', lat: 12.942, lng: 77.583 },
  ];

  const savedDrivers: Driver[] = [];
  for (let i = 0; i < driverData.length; i++) {
    const d = driverData[i];
    let user = await userRepo.findOne({ where: { email: d.email } });
    if (!user) {
      user = userRepo.create({
        name: d.name,
        email: d.email,
        phone: d.phone,
        password_hash: driverPassword,
        role_id: driverRole.id,
        status: UserStatus.ACTIVE,
        employee_code: `DRV-${100 + i}`,
      });
      await userRepo.save(user);
    }

    let drv = await driverRepo.findOne({ where: { user_id: user.id } });
    if (!drv) {
      drv = driverRepo.create({
        user_id: user.id,
        license_number: d.lic,
        license_expiry: new Date('2029-12-31'),
        emergency_contact: '+919888877777',
        duty_status: DriverDutyStatus.AVAILABLE,
        current_latitude: d.lat,
        current_longitude: d.lng,
        current_accuracy: 12.5,
        current_speed: 0,
        current_bearing: 0,
        current_location: {
          type: 'Point',
          coordinates: [d.lng, d.lat],
        } as any,
        last_gps_at: new Date(),
        last_heartbeat_at: new Date(),
      });
      await driverRepo.save(drv);
    }
    savedDrivers.push(drv);
  }
  console.log(`Seeded ${savedDrivers.length} drivers.`);

  // 7. Seed 5 Vehicles
  const vehicleData = [
    { reg: 'KA-04-AB-1234', type: 'MINI_TRUCK', make: 'Tata', model: 'Ace Gold', payload: 750, vol: 4.5, odo: 34200 },
    { reg: 'KA-04-AB-5678', type: 'PICKUP', make: 'Mahindra', model: 'Bolero Maxi Truck', payload: 1300, vol: 7.2, odo: 51200 },
    { reg: 'KA-04-CD-9012', type: 'MINI_TRUCK', make: 'Ashok Leyland', model: 'Dost+', payload: 1500, vol: 8.0, odo: 21800 },
    { reg: 'KA-04-EF-3456', type: 'VAN', make: 'Maruti Suzuki', model: 'Super Carry', payload: 740, vol: 4.2, odo: 18900 },
    { reg: 'KA-04-GH-7890', type: 'TRUCK_MEDIUM', make: 'Eicher', model: 'Pro 2049', payload: 2400, vol: 14.5, odo: 89400 },
  ];

  const savedVehicles: Vehicle[] = [];
  for (const v of vehicleData) {
    let veh = await vehicleRepo.findOne({ where: { registration_number: v.reg } });
    if (!veh) {
      veh = vehicleRepo.create({
        registration_number: v.reg,
        vehicle_type: v.type,
        manufacturer: v.make,
        model: v.model,
        year: 2023,
        fuel_type: 'DIESEL',
        payload_capacity_kg: v.payload,
        volume_capacity_m3: v.vol,
        status: VehicleStatus.AVAILABLE,
        current_latitude: 13.0285,
        current_longitude: 77.5408,
        insurance_expiry: new Date('2028-06-30'),
        fitness_expiry: new Date('2028-06-30'),
        pollution_expiry: new Date('2027-12-31'),
        permit_expiry: new Date('2028-12-31'),
        service_due_km: 40000,
        current_odometer: v.odo,
      });
      await vehicleRepo.save(veh);
    }
    savedVehicles.push(veh);
  }
  console.log(`Seeded ${savedVehicles.length} vehicles.`);

  // 8. Seed System Settings
  const defaultSettings = [
    { key: 'GEOFENCE_RADIUS_METERS_DEFAULT', value: '100', value_type: 'INT', description: 'Default radius for operational arrival detection' },
    { key: 'JOB_ACCEPTANCE_TIMEOUT_SECONDS', value: '60', value_type: 'INT', description: 'Time window for driver to accept job offer' },
    { key: 'GPS_ACCURACY_THRESHOLD_METERS', value: '100', value_type: 'FLOAT', description: 'Points with accuracy above this are flagged LOW_ACCURACY' },
    { key: 'GPS_INTERVAL_IDLE_SECONDS', value: '120', value_type: 'INT', description: 'GPS update interval when driver is idle' },
    { key: 'GPS_INTERVAL_IN_TRANSIT_SECONDS', value: '15', value_type: 'INT', description: 'GPS update interval when job is in progress' },
    { key: 'GPS_INTERVAL_NEAR_STOP_SECONDS', value: '5', value_type: 'INT', description: 'GPS update interval within 500m of stop' },
    { key: 'HEARTBEAT_TIMEOUT_WARNING_MINUTES', value: '5', value_type: 'INT', description: 'Trigger warning if heartbeat absent' },
    { key: 'HEARTBEAT_TIMEOUT_OFFLINE_MINUTES', value: '10', value_type: 'INT', description: 'Mark driver OFFLINE if heartbeat absent' },
    { key: 'MAX_DRIVER_REJECTIONS_PER_DAY', value: '3', value_type: 'INT', description: 'Maximum rejections before dispatch ranking penalty' },
  ];

  for (const s of defaultSettings) {
    const existing = await settingRepo.findOne({ where: { key: s.key } });
    if (!existing) {
      await settingRepo.save(settingRepo.create(s));
    }
  }

  // 9. Seed Sample Orders and Jobs
  const orderExists = await orderRepo.findOne({ where: { order_number: 'ORD-2026-1001' } });
  if (!orderExists) {
    const sampleOrder = orderRepo.create({
      order_number: 'ORD-2026-1001',
      created_by: salesUser.id,
      sales_staff_id: salesUser.id,
      pickup_location_id: savedLocations[1].id, // Peenya Vendor
      delivery_location_id: savedLocations[4].id, // Malleshwaram Metro
      priority: 3,
      order_status: OrderStatus.DISPATCH_PENDING,
      total_weight_kg: 420.5,
      total_volume_m3: 2.8,
      total_quantity: 45,
      requested_pickup_time: new Date(),
      requested_delivery_time: new Date(Date.now() + 3600 * 4 * 1000),
      remarks: 'Handle with care - FMCG packaged goods',
      items: [
        {
          product_name: 'Premium Cooking Oil 15L Tins',
          sku: 'OIL-15L-TIN',
          quantity: 20,
          unit: 'TINS',
          weight_kg: 300.0,
          volume_m3: 1.8,
          remarks: 'Stack max 3 high',
        } as OrderItem,
        {
          product_name: 'Basmati Rice 25kg Bags',
          sku: 'RICE-25KG-BAG',
          quantity: 25,
          unit: 'BAGS',
          weight_kg: 120.5,
          volume_m3: 1.0,
          remarks: 'Moisture sensitive',
        } as OrderItem,
      ],
    });
    await orderRepo.save(sampleOrder);

    // Create Job for sample order
    const sampleJob = jobRepo.create({
      job_number: 'JOB-2026-5001',
      order_id: sampleOrder.id,
      job_type: JobType.DELIVERY,
      status: JobStatus.OFFERED,
      priority: 3,
      assigned_driver_id: savedDrivers[0].id,
      assigned_vehicle_id: savedVehicles[0].id,
      assigned_by: godownUser.id,
      offered_at: new Date(),
      offer_expires_at: new Date(Date.now() + 60 * 1000),
      estimated_distance_km: 8.6,
      estimated_duration_mins: 28,
      stops: [
        {
          sequence_number: 1,
          location_id: savedLocations[1].id, // Pickup
          stop_type: StopType.PICKUP,
          status: StopStatus.PENDING,
          scheduled_time: new Date(),
          remarks: 'Pickup invoice to be signed at gate 2',
        } as JobStop,
        {
          sequence_number: 2,
          location_id: savedLocations[4].id, // Delivery
          stop_type: StopType.DELIVERY,
          status: StopStatus.PENDING,
          scheduled_time: new Date(Date.now() + 3600 * 2 * 1000),
          remarks: 'Customer loading dock at basement',
        } as JobStop,
        {
          sequence_number: 3,
          location_id: savedLocations[0].id, // Return to Yeshwanthpur Godown
          stop_type: StopType.RETURN,
          status: StopStatus.PENDING,
          scheduled_time: new Date(Date.now() + 3600 * 3 * 1000),
          remarks: 'Vehicle return and logbook signoff',
        } as JobStop,
      ],
    });
    await jobRepo.save(sampleJob);
    console.log('Seeded sample Order (ORD-2026-1001) and Multi-stop Job (JOB-2026-5001).');
  }

  console.log('--- Fleet System Seeding Completed Successfully ---');
}

// Direct execution entrypoint
if (require.main === module) {
  AppDataSource.initialize()
    .then(async (ds) => {
      await runSeed(ds);
      await ds.destroy();
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed execution failed:', err);
      process.exit(1);
    });
}
