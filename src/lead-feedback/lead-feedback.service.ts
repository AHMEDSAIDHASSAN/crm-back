import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateLeadFeedbackDto } from './dto/create-lead-feedback.dto';
import { UpdateLeadFeedbackDto } from './dto/update-lead-feedback.dto';

import { LeadStatus } from '@prisma/client';

@Injectable()
export class LeadFeedbackService {
  constructor(private prisma: PrismaService) { }

  async create(createLeadFeedbackDto: CreateLeadFeedbackDto) {
    const { leadId, userId, feedbackType, ...rest } = createLeadFeedbackDto;
    return this.prisma.leadFeedback.create({
      data: {
        ...rest,
        feedbackType: feedbackType as LeadStatus,
        leadId: BigInt(leadId),
        userId: BigInt(userId),
      },
    });
  }

  async findAll() {
    return this.prisma.leadFeedback.findMany({
      include: {
        lead: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Safety limit
    });
  }

  async findOne(id: number) {
    const feedback = await this.prisma.leadFeedback.findUnique({
      where: { id: BigInt(id) },
      include: {
        lead: true,
        user: true,
      },
    });

    if (!feedback) {
      throw new NotFoundException(`Lead feedback with ID ${id} not found`);
    }

    return feedback;
  }

  async update(id: number, updateLeadFeedbackDto: UpdateLeadFeedbackDto) {
    const { leadId, userId, feedbackType, ...rest } = updateLeadFeedbackDto;

    try {
      return await this.prisma.leadFeedback.update({
        where: { id: BigInt(id) },
        data: {
          ...rest,
          ...(feedbackType && { feedbackType: feedbackType as LeadStatus }),
          ...(leadId && { leadId: BigInt(leadId) }),
          ...(userId && { userId: BigInt(userId) }),
        },
      });
    } catch (error) {
      throw new NotFoundException(`Lead feedback with ID ${id} not found`);
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.leadFeedback.delete({
        where: { id: BigInt(id) },
      });
    } catch (error) {
      throw new NotFoundException(`Lead feedback with ID ${id} not found`);
    }
  }
}
