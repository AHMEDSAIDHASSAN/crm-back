import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateResaleUnitDto } from './dto/create-resale-unit.dto';
import { UpdateResaleUnitDto } from './dto/update-resale-unit.dto';

@Injectable()
export class ResaleUnitsService {
  constructor(private prisma: PrismaService) { }

  async create(createResaleUnitDto: CreateResaleUnitDto) {
    return this.prisma.resaleUnit.create({
      data: {
        ...createResaleUnitDto,
        createdBy: BigInt(createResaleUnitDto.createdBy),
        askingPrice: createResaleUnitDto.askingPrice ? Number(createResaleUnitDto.askingPrice) : null,
        area: createResaleUnitDto.area ? Number(createResaleUnitDto.area) : null,
      },
    });
  }

  async findAll() {
    return this.prisma.resaleUnit.findMany({
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const unit = await this.prisma.resaleUnit.findUnique({
      where: { id: BigInt(id) },
      include: {
        creator: true,
      },
    });

    if (!unit) {
      throw new NotFoundException(`Resale unit with ID ${id} not found`);
    }

    return unit;
  }

  async update(id: number, updateResaleUnitDto: UpdateResaleUnitDto) {
    const { createdBy, askingPrice, area, ...rest } = updateResaleUnitDto;

    try {
      return await this.prisma.resaleUnit.update({
        where: { id: BigInt(id) },
        data: {
          ...rest,
          ...(createdBy && { createdBy: BigInt(createdBy) }),
          ...(askingPrice && { askingPrice: Number(askingPrice) }),
          ...(area && { area: Number(area) }),
        },
      });
    } catch (error) {
      throw new NotFoundException(`Resale unit with ID ${id} not found`);
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.resaleUnit.delete({
        where: { id: BigInt(id) },
      });
    } catch (error) {
      throw new NotFoundException(`Resale unit with ID ${id} not found`);
    }
  }
}
