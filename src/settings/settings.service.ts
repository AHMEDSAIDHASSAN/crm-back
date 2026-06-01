import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) { }

  async create(createSettingDto: CreateSettingDto) {
    return this.prisma.systemSetting.create({
      data: createSettingDto,
    });
  }

  async findAll() {
    return this.prisma.systemSetting.findMany();
  }

  async findByKey(key: string) {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { settingKey: key },
    });

    if (!setting) {
      throw new NotFoundException(`Setting with key ${key} not found`);
    }

    return setting;
  }

  async findOne(id: number) {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { id },
    });

    if (!setting) {
      throw new NotFoundException(`Setting with ID ${id} not found`);
    }

    return setting;
  }

  async update(id: number, updateSettingDto: UpdateSettingDto) {
    try {
      return await this.prisma.systemSetting.update({
        where: { id },
        data: updateSettingDto,
      });
    } catch (error) {
      throw new NotFoundException(`Setting with ID ${id} not found`);
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.systemSetting.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(`Setting with ID ${id} not found`);
    }
  }
}
