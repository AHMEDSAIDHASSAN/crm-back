import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateCallDto } from './dto/create-call.dto';
import { UpdateCallDto } from './dto/update-call.dto';

@Injectable()
export class CallsService {
  constructor(private prisma: PrismaService) { }

  async create(createCallDto: CreateCallDto) {
    return this.prisma.callLog.create({
      data: {
        ...createCallDto,
        leadId: BigInt(createCallDto.leadId),
        userId: BigInt(createCallDto.userId),
        feedbackId: createCallDto.feedbackId ? BigInt(createCallDto.feedbackId) : null,
      },
    });
  }

  async findAll() {
    return this.prisma.callLog.findMany({
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
    });
  }

  async findOne(id: number) {
    const callLog = await this.prisma.callLog.findUnique({
      where: { id: BigInt(id) },
      include: {
        lead: true,
        user: true,
        feedback: true,
      },
    });

    if (!callLog) {
      throw new NotFoundException(`Call log with ID ${id} not found`);
    }

    return callLog;
  }

  async update(id: number, updateCallDto: UpdateCallDto) {
    const { leadId, userId, feedbackId, ...rest } = updateCallDto;

    try {
      return await this.prisma.callLog.update({
        where: { id: BigInt(id) },
        data: {
          ...rest,
          ...(leadId && { leadId: BigInt(leadId) }),
          ...(userId && { userId: BigInt(userId) }),
          ...(feedbackId && { feedbackId: BigInt(feedbackId) }),
        },
      });
    } catch (error) {
      throw new NotFoundException(`Call log with ID ${id} not found`);
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.callLog.delete({
        where: { id: BigInt(id) },
      });
    } catch (error) {
      throw new NotFoundException(`Call log with ID ${id} not found`);
    }
  }
}
