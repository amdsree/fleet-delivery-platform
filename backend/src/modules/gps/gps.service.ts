import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { GpsTelemetry } from '../../database/entities/gps-telemetry.entity';
import { Driver } from '../../database/entities/driver.entity';
import { Job } from '../../database/entities/job.entity';
import { JobStop } from '../../database/entities/job-stop.entity';
import { Trip } from '../../database/entities/trip.entity';
import { StopStatus, DriverDutyStatus } from '../../common/enums';
import { BatchGpsDto, HeartbeatDto } from './dto/gps.dto';

const MAX_REALISTIC_SPEED_MPS = 36.1; // ~130 km/h
const ACCURACY_THRESHOLD_METERS = 100.0;

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

@Injectable()
export class GpsService {
  private readonly logger = new Logger(GpsService.name);

  constructor(
    @InjectRepository(GpsTelemetry)
    private readonly telemetryRepo: Repository<GpsTelemetry>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(JobStop)
    private readonly stopRepo: Repository<JobStop>,
    @InjectRepository(Trip)
    private readonly tripRepo: Repository<Trip>,
    private readonly dataSource: DataSource,
  ) {}

  async ingestBatch(dto: BatchGpsDto) {
    if (!dto.points || dto.points.length === 0) {
      return { ingested: 0, valid: 0, filtered: 0 };
    }

    const driver = await this.driverRepo.findOne({ where: { id: dto.driver_id } });
    if (!driver) {
      throw new Error(`Driver ${dto.driver_id} not found`);
    }

    // Sort chronologically
    const sortedPoints = [...dto.points].sort(
      (a, b) => new Date(a.timestamp_device).getTime() - new Date(b.timestamp_device).getTime(),
    );

    let lastValidPoint: { lat: number; lng: number; time: number } | null =
      driver.current_latitude && driver.current_longitude && driver.last_gps_at
        ? {
            lat: Number(driver.current_latitude),
            lng: Number(driver.current_longitude),
            time: new Date(driver.last_gps_at).getTime(),
          }
        : null;

    let validCount = 0;
    let filteredCount = 0;
    let incrementalValidatedDistanceMeters = 0;
    let lastValidDevicePoint: any = null;

    const entitiesToSave: GpsTelemetry[] = [];

    for (const pt of sortedPoints) {
      let isFiltered = false;

      // 1. Accuracy Check
      if (pt.accuracy && pt.accuracy > ACCURACY_THRESHOLD_METERS) {
        isFiltered = true;
      }

      // 2. Mock Location Check
      if (pt.is_mock && process.env.ALLOW_MOCK_LOCATION !== 'true') {
        isFiltered = true;
      }

      // 3. Jump & Velocity Check
      const ptTime = new Date(pt.timestamp_device).getTime();
      if (lastValidPoint) {
        const deltaSeconds = (ptTime - lastValidPoint.time) / 1000;
        if (deltaSeconds > 0) {
          const distMeters = haversineMeters(
            lastValidPoint.lat,
            lastValidPoint.lng,
            pt.latitude,
            pt.longitude,
          );
          const speedMps = distMeters / deltaSeconds;

          if (speedMps > MAX_REALISTIC_SPEED_MPS) {
            isFiltered = true; // Teleportation jump
          } else if (!isFiltered) {
            // Valid step - only accumulate distance if movement > 5m to eliminate stationary jitter
            if (distMeters >= 5) {
              incrementalValidatedDistanceMeters += distMeters;
            }
          }
        }
      }

      if (!isFiltered) {
        validCount++;
        lastValidPoint = { lat: pt.latitude, lng: pt.longitude, time: ptTime };
        lastValidDevicePoint = pt;
      } else {
        filteredCount++;
      }

      const entity = this.telemetryRepo.create({
        driver_id: dto.driver_id,
        job_id: dto.job_id || null,
        vehicle_id: dto.vehicle_id || null,
        latitude: pt.latitude,
        longitude: pt.longitude,
        location: {
          type: 'Point',
          coordinates: [pt.longitude, pt.latitude],
        } as any,
        accuracy: pt.accuracy || null,
        altitude: pt.altitude || null,
        speed: pt.speed || null,
        bearing: pt.bearing || null,
        battery_level: pt.battery_level || null,
        network_type: pt.network_type || null,
        is_mock: pt.is_mock || false,
        provider: pt.provider || null,
        sequence_number: pt.sequence_number || null,
        timestamp_device: new Date(pt.timestamp_device),
        is_filtered: isFiltered,
      });

      entitiesToSave.push(entity);
    }

    // Persist batch
    await this.telemetryRepo.save(entitiesToSave);

    // Update driver latest validated position
    if (lastValidDevicePoint) {
      driver.current_latitude = lastValidDevicePoint.latitude;
      driver.current_longitude = lastValidDevicePoint.longitude;
      driver.current_location = {
        type: 'Point',
        coordinates: [lastValidDevicePoint.longitude, lastValidDevicePoint.latitude],
      } as any;
      driver.current_accuracy = lastValidDevicePoint.accuracy || driver.current_accuracy;
      driver.current_speed = lastValidDevicePoint.speed || driver.current_speed;
      driver.current_bearing = lastValidDevicePoint.bearing || driver.current_bearing;
      driver.last_gps_at = new Date(lastValidDevicePoint.timestamp_device);
      driver.last_heartbeat_at = new Date();
      await this.driverRepo.save(driver);

      // Check geofences for active job
      if (dto.job_id) {
        await this.checkGeofenceAutoArrival(
          dto.job_id,
          lastValidDevicePoint.latitude,
          lastValidDevicePoint.longitude,
          lastValidDevicePoint.accuracy,
        );
      }
    }

    // Accumulate distance on Trip record if active
    if (dto.job_id && incrementalValidatedDistanceMeters > 0) {
      const trip = await this.tripRepo.findOne({ where: { job_id: dto.job_id } });
      if (trip) {
        const deltaKm = incrementalValidatedDistanceMeters / 1000;
        trip.validated_distance_km = Number(
          (Number(trip.validated_distance_km) + deltaKm).toFixed(2),
        );
        await this.tripRepo.save(trip);
      }
    }

    return {
      ingested: dto.points.length,
      valid: validCount,
      filtered: filteredCount,
      distance_added_km: Number((incrementalValidatedDistanceMeters / 1000).toFixed(2)),
    };
  }

  async recordHeartbeat(dto: HeartbeatDto) {
    const driver = await this.driverRepo.findOne({ where: { id: dto.driver_id } });
    if (!driver) return null;

    driver.last_heartbeat_at = new Date();
    if (dto.latitude && dto.longitude) {
      driver.current_latitude = dto.latitude;
      driver.current_longitude = dto.longitude;
      driver.current_location = {
        type: 'Point',
        coordinates: [dto.longitude, dto.latitude],
      } as any;
      driver.last_gps_at = new Date();
    }
    await this.driverRepo.save(driver);

    return { success: true, timestamp: driver.last_heartbeat_at };
  }

  private async checkGeofenceAutoArrival(
    jobId: string,
    driverLat: number,
    driverLng: number,
    accuracy = 10,
  ) {
    if (accuracy > ACCURACY_THRESHOLD_METERS) {
      return; // Do not trigger auto-arrival on poor GPS accuracy
    }

    // Find active stop (EN_ROUTE)
    const activeStop = await this.stopRepo
      .createQueryBuilder('stop')
      .leftJoinAndSelect('stop.location', 'location')
      .where('stop.job_id = :jobId', { jobId })
      .andWhere('stop.status = :status', { status: StopStatus.EN_ROUTE })
      .orderBy('stop.sequence_number', 'ASC')
      .getOne();

    if (!activeStop || !activeStop.location) return;

    const loc = activeStop.location;
    const distanceMeters = haversineMeters(
      driverLat,
      driverLng,
      Number(loc.latitude),
      Number(loc.longitude),
    );

    const radius = loc.geofence_radius_meters || 100;

    if (distanceMeters <= radius && !activeStop.gps_auto_arrived_at) {
      activeStop.gps_auto_arrived_at = new Date();
      activeStop.status = StopStatus.ARRIVED;
      activeStop.latitude_at_arrival = driverLat;
      activeStop.longitude_at_arrival = driverLng;
      activeStop.gps_accuracy_at_arrival = accuracy;
      await this.stopRepo.save(activeStop);

      this.logger.log(
        `Auto-geofence arrival recorded for Stop #${activeStop.sequence_number} (${loc.name})`,
      );
    }
  }
}
