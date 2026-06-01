import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateLeadAutoRetractionDto } from './dto/create-lead-auto-retraction.dto';
import { UpdateLeadAutoRetractionDto } from './dto/update-lead-auto-retraction.dto';

@Injectable()
export class LeadAutoRetractionsService {
  constructor(private prisma: PrismaService) { }

  async create(createLeadAutoRetractionDto: CreateLeadAutoRetractionDto) {
    return this.prisma.leadAutoRetraction.create({
      data: {
        ...createLeadAutoRetractionDto,
        leadId: BigInt(createLeadAutoRetractionDto.leadId),
        previousOwner: BigInt(createLeadAutoRetractionDto.previousOwner),
        reassignedTo: createLeadAutoRetractionDto.reassignedTo ? BigInt(createLeadAutoRetractionDto.reassignedTo) : null,
      },
    });
  }

  async findAll() {
    return this.prisma.leadAutoRetraction.findMany({
      include: {
        lead: true,
        previousUser: true,
        reassignedUser: true,
      },
      orderBy: { retractedAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const retraction = await this.prisma.leadAutoRetraction.findUnique({
      where: { id: BigInt(id) },
      include: {
        lead: true,
        previousUser: true,
        reassignedUser: true,
      },
    });

    if (!retraction) {
      throw new NotFoundException(`Lead auto-retraction with ID ${id} not found`);
    }

    return retraction;
  }

  async update(id: number, updateLeadAutoRetractionDto: UpdateLeadAutoRetractionDto) {
    const { leadId, previousOwner, reassignedTo, ...rest } = updateLeadAutoRetractionDto;
    try {
      return await this.prisma.leadAutoRetraction.update({
        where: { id: BigInt(id) },
        data: {
          ...rest,
          ...(leadId && { leadId: BigInt(leadId) }),
          ...(previousOwner && { previousOwner: BigInt(previousOwner) }),
          ...(reassignedTo && { reassignedTo: BigInt(reassignedTo) }),
        },
      });
    } catch (error) {
      throw new NotFoundException(`Lead auto-retraction with ID ${id} not found`);
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.leadAutoRetraction.delete({
        where: { id: BigInt(id) },
      });
    } catch (error) {
      throw new NotFoundException(`Lead auto-retraction with ID ${id} not found`);
    }
  }
}
