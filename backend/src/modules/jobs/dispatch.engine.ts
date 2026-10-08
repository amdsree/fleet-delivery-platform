import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Driver } from '../../database/entities/driver.entity';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { Order } from '../../database/entities/order.entity';
import { Job } from '../../database/entities/job.entity';
import { DriverDutyStatus, VehicleStatus, JobStatus } from '../../common/enums';

export interface RankedDriverCandidate {
  driver: Driver;
  distance_meters: number;
  distance_km: number;
  score: number;
  rejections: number;
}

@Injectable()
export class DispatchEngine {
  private readonly logger = new Logger(DispatchEngine.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * PostGIS multi-factor candidate ranking
   */
  async rankCandidates(order: Order, maxRadiusKm = 50): Promise<{
    candidates: RankedDriverCandidate[];
    eligibleVehicles: Vehicle[];
  }> {
    const pickupLoc = order.pickup_location;
    if (!pickupLoc) {
      throw new Error('Order does not have a resolved pickup location');
    }

    const radiusMeters = maxRadiusKm * 1000;

    // 1. PostGIS Geographical Candidate Query
    const rawDrivers = await this.dataSource
      .getRepository(Driver)
      .createQueryBuilder('driver')
      .leftJoinAndSelect('driver.user', 'user')
      .where('driver.duty_status = :dutyStatus', {
        dutyStatus: DriverDutyStatus.AVAILABLE,
      })
      .andWhere(
        `ST_DWithin(
          driver.current_location,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
          :radius
        )`,
        { lng: pickupLoc.longitude, lat: pickupLoc.latitude, radius: radiusMeters },
      )
      .addSelect(
        `ST_Distance(
          driver.current_location,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
        )`,
        'distance_meters',
      )
      .getRawAndEntities();

    // 2. Find eligible vehicles based on payload & volume constraints
    const requiredWeight = Number(order.total_weight_kg) || 0;
    const requiredVolume = Number(order.total_volume_m3) || 0;

    const eligibleVehicles = await this.dataSource
      .getRepository(Vehicle)
      .createQueryBuilder('vehicle')
      .where('vehicle.status = :status', { status: VehicleStatus.AVAILABLE })
      .andWhere('vehicle.payload_capacity_kg >= :weight', { weight: requiredWeight })
      .andWhere('vehicle.volume_capacity_m3 >= :vol', { vol: requiredVolume })
      .orderBy('vehicle.payload_capacity_kg', 'ASC') // Most optimal capacity match
      .getMany();

    // 3. Compute Ranking Score
    const candidates: RankedDriverCandidate[] = [];

    for (let i = 0; i < rawDrivers.entities.length; i++) {
      const driver = rawDrivers.entities[i];
      const raw = rawDrivers.raw[i];
      const distMeters = parseFloat(raw.distance_meters || '0');
      const distKm = Number((distMeters / 1000).toFixed(2));

      // Scoring formula:
      // Distance factor: max 0.50 (closer is better)
      const proximityFactor = Math.max(0, 1 - distKm / maxRadiusKm) * 0.5;
      // Rejection penalty: subtract up to 0.20 based on rejections
      const rejectionPenalty =
        Math.min(driver.consecutive_rejections || 0, 4) * 0.05;
      // Base reliability bonus: 0.35
      const baseScore = 0.35;

      const totalScore = Math.max(
        0.01,
        Number((proximityFactor + baseScore - rejectionPenalty).toFixed(3)),
      );

      candidates.push({
        driver,
        distance_meters: distMeters,
        distance_km: distKm,
        score: totalScore,
        rejections: driver.consecutive_rejections || 0,
      });
    }

    // Sort by highest score first
    candidates.sort((a, b) => b.score - a.score);

    return { candidates, eligibleVehicles };
  }
}
