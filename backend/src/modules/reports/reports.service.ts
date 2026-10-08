import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Order } from '../../database/entities/order.entity';
import { Job } from '../../database/entities/job.entity';
import { Driver } from '../../database/entities/driver.entity';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { Trip } from '../../database/entities/trip.entity';
import { DriverDutyStatus, VehicleStatus, OrderStatus, JobStatus } from '../../common/enums';

@Injectable()
export class ReportsService {
  constructor(private readonly dataSource: DataSource) {}

  async getDashboardSummary() {
    const orderRepo = this.dataSource.getRepository(Order);
    const jobRepo = this.dataSource.getRepository(Job);
    const driverRepo = this.dataSource.getRepository(Driver);
    const vehicleRepo = this.dataSource.getRepository(Vehicle);

    // Orders KPIs
    const totalOrders = await orderRepo.count();
    const completedOrders = await orderRepo.count({ where: { order_status: OrderStatus.COMPLETED } });
    const pendingOrders = await orderRepo.count({ where: { order_status: OrderStatus.DISPATCH_PENDING } });
    const inProgressOrders = await orderRepo.count({ where: { order_status: OrderStatus.IN_PROGRESS } });
    const failedOrders = await orderRepo.count({ where: { order_status: OrderStatus.FAILED } });
    const cancelledOrders = await orderRepo.count({ where: { order_status: OrderStatus.CANCELLED } });

    // Active Jobs
    const activeJobs = await jobRepo.count({ where: { status: JobStatus.STARTED } });

    // Drivers breakdown
    const drivers = await driverRepo.find();
    const driverCounts = {
      available: drivers.filter((d) => d.duty_status === DriverDutyStatus.AVAILABLE).length,
      on_job: drivers.filter((d) =>
        [
          DriverDutyStatus.BUSY,
          DriverDutyStatus.AT_PICKUP,
          DriverDutyStatus.LOADING,
          DriverDutyStatus.IN_TRANSIT,
          DriverDutyStatus.AT_DELIVERY,
          DriverDutyStatus.UNLOADING,
        ].includes(d.duty_status),
      ).length,
      at_pickup: drivers.filter((d) => [DriverDutyStatus.AT_PICKUP, DriverDutyStatus.LOADING].includes(d.duty_status)).length,
      at_delivery: drivers.filter((d) => [DriverDutyStatus.AT_DELIVERY, DriverDutyStatus.UNLOADING].includes(d.duty_status)).length,
      returning: drivers.filter((d) => d.duty_status === DriverDutyStatus.RETURNING).length,
      offline: drivers.filter((d) => [DriverDutyStatus.OFFLINE, DriverDutyStatus.OFF_DUTY].includes(d.duty_status)).length,
      total: drivers.length,
    };

    // Vehicles breakdown
    const vehicles = await vehicleRepo.find();
    const vehicleCounts = {
      available: vehicles.filter((v) => v.status === VehicleStatus.AVAILABLE).length,
      in_use: vehicles.filter((v) => [VehicleStatus.ASSIGNED, VehicleStatus.IN_TRIP].includes(v.status)).length,
      maintenance: vehicles.filter((v) => v.status === VehicleStatus.MAINTENANCE).length,
      inactive: vehicles.filter((v) => v.status === VehicleStatus.INACTIVE).length,
      total: vehicles.length,
    };

    return {
      orders: {
        total: totalOrders,
        completed: completedOrders,
        pending: pendingOrders,
        in_progress: inProgressOrders,
        failed: failedOrders,
        cancelled: cancelledOrders,
      },
      active_jobs: activeJobs,
      drivers: driverCounts,
      vehicles: vehicleCounts,
    };
  }

  async getDriverReport(query: { from?: string; to?: string }) {
    const rawData = await this.dataSource.query(`
      SELECT 
        d.id AS driver_id,
        u.name AS driver_name,
        u.phone AS driver_phone,
        d.license_number,
        d.duty_status,
        COUNT(j.id) FILTER (WHERE j.status = 'COMPLETED') AS jobs_completed,
        COUNT(j.id) FILTER (WHERE j.status = 'REJECTED') AS jobs_rejected,
        COUNT(j.id) FILTER (WHERE j.status = 'FAILED') AS jobs_failed,
        COALESCE(SUM(t.validated_distance_km), 0) AS total_validated_km,
        COALESCE(SUM(t.raw_distance_km), 0) AS total_raw_km,
        COALESCE(SUM(t.driving_duration_mins), 0) AS total_driving_mins,
        COALESCE(AVG(j.actual_duration_mins) FILTER (WHERE j.status = 'COMPLETED'), 0) AS avg_delivery_time_mins
      FROM drivers d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN jobs j ON j.assigned_driver_id = d.id
      LEFT JOIN trips t ON t.driver_id = d.id
      GROUP BY d.id, u.name, u.phone, d.license_number, d.duty_status
      ORDER BY jobs_completed DESC
    `);
    return rawData;
  }

  async getVehicleReport() {
    const rawData = await this.dataSource.query(`
      SELECT 
        v.id AS vehicle_id,
        v.registration_number,
        v.vehicle_type,
        v.manufacturer,
        v.model,
        v.payload_capacity_kg,
        v.status,
        v.current_odometer,
        v.service_due_km,
        COUNT(t.id) AS total_trips,
        COALESCE(SUM(t.validated_distance_km), 0) AS total_trip_distance_km
      FROM vehicles v
      LEFT JOIN trips t ON t.vehicle_id = v.id
      GROUP BY v.id
      ORDER BY total_trip_distance_km DESC
    `);
    return rawData;
  }

  async getTripReport(limit = 100) {
    const trips = await this.dataSource.getRepository(Trip).find({
      relations: ['job', 'job.order', 'driver', 'driver.user', 'vehicle'],
      order: { start_time: 'DESC' },
      take: limit,
    });
    return trips;
  }

  formatAsCsv(data: any[]): string {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map((item) =>
      headers
        .map((header) => {
          const val = item[header];
          return `"${(val !== null && val !== undefined ? String(val) : '').replace(/"/g, '""')}"`;
        })
        .join(','),
    );
    return [headers.join(','), ...rows].join('\n');
  }
}
