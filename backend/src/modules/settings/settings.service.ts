import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '../../database/entities/system-support.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingRepo: Repository<SystemSetting>,
  ) {}

  async getAll() {
    return this.settingRepo.find();
  }

  async getByKey(key: string, defaultValue = '') {
    const setting = await this.settingRepo.findOne({ where: { key } });
    return setting ? setting.value : defaultValue;
  }

  async update(key: string, value: string) {
    let setting = await this.settingRepo.findOne({ where: { key } });
    if (!setting) {
      setting = this.settingRepo.create({ key, value });
    } else {
      setting.value = value;
    }
    return this.settingRepo.save(setting);
  }
}
