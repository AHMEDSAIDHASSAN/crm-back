import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../config/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
  ) { }

  async create(createNotificationDto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        ...createNotificationDto,
        userId: BigInt(createNotificationDto.userId),
      },
    });
  }

  async findAll() {
    return this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findForUser(userId: number) {
    return this.prisma.notification.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: BigInt(id) },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return notification;
  }

  async update(id: number, updateNotificationDto: UpdateNotificationDto) {
    const { userId, ...rest } = updateNotificationDto;

    try {
      return await this.prisma.notification.update({
        where: { id: BigInt(id) },
        data: {
          ...rest,
          ...(userId && { userId: BigInt(userId) }),
        },
      });
    } catch (error) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.notification.delete({
        where: { id: BigInt(id) },
      });
    } catch (error) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
  }

  async markAsRead(id: number) {
    return this.prisma.notification.update({
      where: { id: BigInt(id) },
      data: { isRead: true },
    });
  }

  async markAllReadForUser(userId: number) {
    return this.prisma.notification.updateMany({
      where: { userId: BigInt(userId), isRead: false },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: number) {
    return this.prisma.notification.count({
      where: { userId: BigInt(userId), isRead: false },
    });
  }

  async createAndEmit(params: {
    userId: number | bigint;
    type: NotificationType;
    title: string;
    message?: string;
    relatedEntityType?: string;
    relatedEntityId?: number | bigint;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: BigInt(params.userId),
        notificationType: params.type,
        title: params.title,
        message: params.message ?? null,
        relatedEntityType: params.relatedEntityType ?? null,
        relatedEntityId: params.relatedEntityId
          ? BigInt(params.relatedEntityId)
          : null,
      },
    });

    this.gateway.sendToUser(params.userId, {
      id: notification.id.toString(),
      notificationType: notification.notificationType,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      relatedEntityType: notification.relatedEntityType,
      relatedEntityId: notification.relatedEntityId?.toString() ?? null,
      createdAt: notification.createdAt.toISOString(),
    });

    return notification;
  }
}
