import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateAuditDto } from './dto/create-audit.dto';
import { UpdateAuditDto } from './dto/update-audit.dto';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) { }

  async create(createAuditDto: CreateAuditDto) {
    return this.prisma.auditLog.create({
      data: {
        ...createAuditDto,
        userId: createAuditDto.userId ? BigInt(createAuditDto.userId) : null,
      },
    });
  }

  async findAll() {
    return this.prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit audit logs
    });
  }

  async findOne(id: number) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id: BigInt(id) },
      include: {
        user: true,
      },
    });

    if (!log) {
      throw new NotFoundException(`Audit log with ID ${id} not found`);
    }

    return log;
  }

  // Audits are typically immutable, but scaffolded with update/remove
  async update(id: number, updateAuditDto: UpdateAuditDto) {
    const { userId, ...rest } = updateAuditDto;
    try {
      return await this.prisma.auditLog.update({
        where: { id: BigInt(id) },
        data: {
          ...rest,
          ...(userId && { userId: BigInt(userId) }),
        },
      });
    } catch (error) {
      throw new NotFoundException(`Audit log with ID ${id} not found`);
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.auditLog.delete({
        where: { id: BigInt(id) },
      });
    } catch (error) {
      throw new NotFoundException(`Audit log with ID ${id} not found`);
    }
  }
}
