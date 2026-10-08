import { DispatchEngine } from '../modules/jobs/dispatch.engine';
import { DriverDutyStatus, VehicleStatus } from '../common/enums';

describe('DispatchEngine Unit Tests', () => {
  let dispatchEngine: DispatchEngine;
  let mockDataSource: any;

  beforeEach(() => {
    mockDataSource = {
      getRepository: jest.fn(),
    };
    dispatchEngine = new DispatchEngine(mockDataSource);
  });

  it('should rank drivers prioritizing closer proximity and lower rejection history', async () => {
    const mockOrder: any = {
      total_weight_kg: 500,
      total_volume_m3: 3.5,
      pickup_location: { latitude: 12.9716, longitude: 77.5946 },
    };

    // Driver A is 5km away with 0 rejections
    // Driver B is 35km away with 0 rejections
    // Driver C is 6km away with 4 rejections
    const rawDrivers = {
      entities: [
        { id: 'driver-a', consecutive_rejections: 0, duty_status: DriverDutyStatus.AVAILABLE },
        { id: 'driver-b', consecutive_rejections: 0, duty_status: DriverDutyStatus.AVAILABLE },
        { id: 'driver-c', consecutive_rejections: 4, duty_status: DriverDutyStatus.AVAILABLE },
      ],
      raw: [
        { distance_meters: '5000' },
        { distance_meters: '35000' },
        { distance_meters: '6000' },
      ],
    };

    const mockVehicles = [
      { id: 'veh-1', payload_capacity_kg: 800, volume_capacity_m3: 4.5, status: VehicleStatus.AVAILABLE },
      { id: 'veh-2', payload_capacity_kg: 1500, volume_capacity_m3: 8.0, status: VehicleStatus.AVAILABLE },
    ];

    const driverQb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getRawAndEntities: jest.fn().mockResolvedValue(rawDrivers),
    };

    const vehicleQb: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(mockVehicles),
    };

    mockDataSource.getRepository.mockImplementation((entity: any) => {
      if (entity.name === 'Driver') {
        return { createQueryBuilder: () => driverQb };
      }
      return { createQueryBuilder: () => vehicleQb };
    });

    const result = await dispatchEngine.rankCandidates(mockOrder, 50);

    expect(result.candidates.length).toBe(3);
    // Driver A should rank highest due to close distance (5km) and 0 rejections
    expect(result.candidates[0].driver.id).toBe('driver-a');
    expect(result.candidates[0].score).toBeGreaterThan(result.candidates[1].score);
    // Driver C has 4 rejections penalty, so should have lower score than Driver A
    expect(result.candidates[0].score).toBeGreaterThan(result.candidates[2].score);
    expect(result.eligibleVehicles.length).toBe(2);
  });

  it('should filter out vehicles that do not meet payload capacity', async () => {
    const mockOrder: any = {
      total_weight_kg: 1200,
      total_volume_m3: 6.0,
      pickup_location: { latitude: 12.9716, longitude: 77.5946 },
    };

    const driverQb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getRawAndEntities: jest.fn().mockResolvedValue({ entities: [], raw: [] }),
    };

    const vehicleQb: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        { id: 'large-truck', payload_capacity_kg: 2000, volume_capacity_m3: 10.0, status: VehicleStatus.AVAILABLE },
      ]),
    };

    mockDataSource.getRepository.mockImplementation((entity: any) => {
      if (entity.name === 'Driver') return { createQueryBuilder: () => driverQb };
      return { createQueryBuilder: () => vehicleQb };
    });

    const result = await dispatchEngine.rankCandidates(mockOrder);
    expect(result.eligibleVehicles.length).toBe(1);
    expect(result.eligibleVehicles[0].id).toBe('large-truck');
  });
});
