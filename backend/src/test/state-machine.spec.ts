import { DriversService } from '../modules/drivers/drivers.service';
import { DriverDutyStatus } from '../common/enums';
import { BadRequestException } from '@nestjs/common';

describe('State Machine & Transition Rules', () => {
  let driversService: DriversService;
  let mockDriverRepo: any;
  let mockAuditService: any;

  beforeEach(() => {
    mockDriverRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'driver-1',
        duty_status: DriverDutyStatus.AVAILABLE,
        consecutive_rejections: 0,
      }),
      save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
    };
    mockAuditService = { log: jest.fn().mockResolvedValue({}) };

    driversService = new DriversService(
      mockDriverRepo,
      {} as any,
      {} as any,
      {} as any,
      mockAuditService,
    );
  });

  it('should allow valid transition: AVAILABLE -> OFF_DUTY', async () => {
    const updated = await driversService.updateDutyStatus(
      'driver-1',
      { duty_status: DriverDutyStatus.OFF_DUTY },
      'driver-user-id',
      'DRIVER',
    );
    expect(updated.duty_status).toBe(DriverDutyStatus.OFF_DUTY);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DRIVER_DUTY_STATUS_CHANGED' }),
    );
  });

  it('should reject invalid transition: AVAILABLE -> UNLOADING (skipping pickup and transit)', async () => {
    await expect(
      driversService.updateDutyStatus(
        'driver-1',
        { duty_status: DriverDutyStatus.UNLOADING },
        'driver-user-id',
        'DRIVER',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should allow Admin override of state transition', async () => {
    const updated = await driversService.updateDutyStatus(
      'driver-1',
      { duty_status: DriverDutyStatus.UNLOADING },
      'admin-id',
      'ADMIN',
    );
    expect(updated.duty_status).toBe(DriverDutyStatus.UNLOADING);
  });
});
