import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateWhatsappDto } from './dto/create-whatsapp.dto';
import { UpdateWhatsappDto } from './dto/update-whatsapp.dto';

@Injectable()
export class WhatsappService {
  constructor(private prisma: PrismaService) { }

  async create(createWhatsappDto: CreateWhatsappDto) {
    return this.prisma.whatsappInteraction.create({
      data: {
        ...createWhatsappDto,
        leadId: BigInt(createWhatsappDto.leadId),
        userId: BigInt(createWhatsappDto.userId),
        feedbackId: createWhatsappDto.feedbackId ? BigInt(createWhatsappDto.feedbackId) : null,
      },
    });
  }

  async findAll() {
    return this.prisma.whatsappInteraction.findMany({
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
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const interaction = await this.prisma.whatsappInteraction.findUnique({
      where: { id: BigInt(id) },
      include: {
        lead: true,
        user: true,
        feedback: true,
      },
    });

    if (!interaction) {
      throw new NotFoundException(`WhatsApp interaction with ID ${id} not found`);
    }

    return interaction;
  }

  async update(id: number, updateWhatsappDto: UpdateWhatsappDto) {
    const { leadId, userId, feedbackId, ...rest } = updateWhatsappDto;

    try {
      return await this.prisma.whatsappInteraction.update({
        where: { id: BigInt(id) },
        data: {
          ...rest,
          ...(leadId && { leadId: BigInt(leadId) }),
          ...(userId && { userId: BigInt(userId) }),
          ...(feedbackId && { feedbackId: BigInt(feedbackId) }),
        },
      });
    } catch (error) {
      throw new NotFoundException(`WhatsApp interaction with ID ${id} not found`);
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.whatsappInteraction.delete({
        where: { id: BigInt(id) },
      });
    } catch (error) {
      throw new NotFoundException(`WhatsApp interaction with ID ${id} not found`);
    }
  }
}
