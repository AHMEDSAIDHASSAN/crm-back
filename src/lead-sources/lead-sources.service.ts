import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateLeadSourceDto } from './dto/create-lead-source.dto';
import { UpdateLeadSourceDto } from './dto/update-lead-source.dto';

@Injectable()
export class LeadSourcesService {
  constructor(private prisma: PrismaService) { }

  async create(createLeadSourceDto: CreateLeadSourceDto) {
    return this.prisma.leadSource.create({
      data: createLeadSourceDto,
    });
  }

  async findAll() {
    return this.prisma.leadSource.findMany({
      include: {
        _count: {
          select: { leads: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const leadSource = await this.prisma.leadSource.findUnique({
      where: { id },
      include: {
        leads: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!leadSource) {
      throw new NotFoundException(`LeadSource with ID ${id} not found`);
    }

    return leadSource;
  }

  async update(id: number, updateLeadSourceDto: UpdateLeadSourceDto) {
    try {
      return await this.prisma.leadSource.update({
        where: { id },
        data: updateLeadSourceDto,
      });
    } catch (error) {
      throw new NotFoundException(`LeadSource with ID ${id} not found`);
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.leadSource.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(`LeadSource with ID ${id} not found`);
    }
  }
}
