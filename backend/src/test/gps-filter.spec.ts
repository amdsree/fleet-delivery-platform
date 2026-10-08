import { GpsService } from '../modules/gps/gps.service';

describe('GpsService Telemetry & Filtering Unit Tests', () => {
  let gpsService: GpsService;
  let mockTelemetryRepo: any;
  let mockDriverRepo: any;
  let mockJobRepo: any;
  let mockStopRepo: any;
  let mockTripRepo: any;
  let mockDataSource: any;

  beforeEach(() => {
    mockTelemetryRepo = {
      create: jest.fn().mockImplementation((val) => val),
      save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
    };
    mockDriverRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'driver-1',
        current_latitude: 12.9716,
        current_longitude: 77.5946,
        last_gps_at: new Date('2026-10-08T05:00:00Z'),
      }),
      save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
    };
    mockJobRepo = { findOne: jest.fn() };
    mockStopRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      }),
    };
    mockTripRepo = {
      findOne: jest.fn().mockResolvedValue({ validated_distance_km: 10.0 }),
      save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
    };
    mockDataSource = {};

    gpsService = new GpsService(
      mockTelemetryRepo,
      mockDriverRepo,
      mockJobRepo,
      mockStopRepo,
      mockTripRepo,
      mockDataSource,
    );
  });

  it('should flag points with accuracy > 100m as is_filtered = true', async () => {
    const batchDto = {
      driver_id: 'driver-1',
      points: [
        {
          latitude: 12.972,
          longitude: 77.595,
          accuracy: 150.0, // Low accuracy!
          timestamp_device: '2026-10-08T05:00:15Z',
        },
      ],
    };

    const res = await gpsService.ingestBatch(batchDto);
    expect(res.filtered).toBe(1);
    expect(res.valid).toBe(0);

    const savedEntity = mockTelemetryRepo.create.mock.calls[0][0];
    expect(savedEntity.is_filtered).toBe(true);
  });

  it('should filter out impossible teleportation jumps (velocity > 130 km/h)', async () => {
    const batchDto = {
      driver_id: 'driver-1',
      points: [
        {
          latitude: 13.500, // jumped ~60km in 10 seconds!
          longitude: 78.000,
          accuracy: 10.0,
          timestamp_device: '2026-10-08T05:00:10Z',
        },
      ],
    };

    const res = await gpsService.ingestBatch(batchDto);
    expect(res.filtered).toBe(1);
    expect(res.valid).toBe(0);
  });

  it('should accept realistic points and accurately accumulate distance', async () => {
    const batchDto = {
      driver_id: 'driver-1',
      job_id: 'job-1',
      points: [
        {
          // ~111m north in 15 seconds (realistic speed ~26 km/h)
          latitude: 12.9726,
          longitude: 77.5946,
          accuracy: 8.0,
          speed: 7.4,
          timestamp_device: '2026-10-08T05:00:15Z',
        },
      ],
    };

    const res = await gpsService.ingestBatch(batchDto);
    expect(res.valid).toBe(1);
    expect(res.filtered).toBe(0);
    expect(res.distance_added_km).toBeGreaterThan(0.05);
    expect(res.distance_added_km).toBeLessThan(0.2);
  });
});
