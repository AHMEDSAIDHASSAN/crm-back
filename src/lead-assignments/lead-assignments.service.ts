import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateLeadAssignmentDto } from './dto/create-lead-assignment.dto';
import { UpdateLeadAssignmentDto } from './dto/update-lead-assignment.dto';

@Injectable()
export class LeadAssignmentsService {
  constructor(private prisma: PrismaService) { }

  async create(createLeadAssignmentDto: CreateLeadAssignmentDto) {
    return this.prisma.leadAssignment.create({
      data: {
        ...createLeadAssignmentDto,
        leadId: BigInt(createLeadAssignmentDto.leadId),
        assignedTo: BigInt(createLeadAssignmentDto.assignedTo),
        assignedBy: createLeadAssignmentDto.assignedBy ? BigInt(createLeadAssignmentDto.assignedBy) : null,
      },
    });
  }

  async findAll() {
    return this.prisma.leadAssignment.findMany({
      include: {
        lead: true,
        assignedUser: true,
        assigner: true,
      },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const assignment = await this.prisma.leadAssignment.findUnique({
      where: { id: BigInt(id) },
      include: {
        lead: true,
        assignedUser: true,
        assigner: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Lead assignment with ID ${id} not found`);
    }

    return assignment;
  }

  async update(id: number, updateLeadAssignmentDto: UpdateLeadAssignmentDto) {
    const { leadId, assignedTo, assignedBy, ...rest } = updateLeadAssignmentDto;
    try {
      return await this.prisma.leadAssignment.update({
        where: { id: BigInt(id) },
        data: {
          ...rest,
          ...(leadId && { leadId: BigInt(leadId) }),
          ...(assignedTo && { assignedTo: BigInt(assignedTo) }),
          ...(assignedBy && { assignedBy: BigInt(assignedBy) }),
        },
      });
    } catch (error) {
      throw new NotFoundException(`Lead assignment with ID ${id} not found`);
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.leadAssignment.delete({
        where: { id: BigInt(id) },
      });
    } catch (error) {
      throw new NotFoundException(`Lead assignment with ID ${id} not found`);
    }
  }
}
