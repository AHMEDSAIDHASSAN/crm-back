import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { SalesCheckInDto } from './dto/sales-check-in.dto';
import { SalesCheckOutDto } from './dto/sales-check-out.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { createPaginatedResponse } from '../common/pagination.interface';
import { Prisma } from '@prisma/client';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) { }

  async create(createAttendanceDto: CreateAttendanceDto) {
    return this.prisma.attendanceLog.create({
      data: {
        ...createAttendanceDto,
        userId: BigInt(createAttendanceDto.userId),
      },
    });
  }

  async findAll(paginationDto: PaginationDto = {}, date?: string, teamId?: number, userId?: number) {
    const { page = 1, limit = 10, search } = paginationDto;
    const skip = (page - 1) * limit;

    const where: Prisma.AttendanceLogWhereInput = {};

    if (date && typeof date === 'string' && date.trim().length > 0) {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      where.checkInTime = { gte: startOfDay, lte: endOfDay };
    }

    if (userId) {
      where.userId = BigInt(userId);
    }

    if (teamId) {
      where.user = { teamId: BigInt(teamId) };
    }

    if (search) {
      where.user = {
        ...((where.user as any) || {}),
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { phone: { contains: search } },
        ],
      };
    }

    const [logs, total] = await Promise.all([
      this.prisma.attendanceLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              team: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { checkInTime: 'desc' },
      }),
      this.prisma.attendanceLog.count({ where }),
    ]);

    return createPaginatedResponse(logs, total, page, limit);
  }

  async findOne(id: number) {
    const log = await this.prisma.attendanceLog.findUnique({
      where: { id: BigInt(id) },
      include: {
        user: true,
      },
    });

    if (!log) {
      throw new NotFoundException(`Attendance log with ID ${id} not found`);
    }

    return log;
  }

  async update(id: number, updateAttendanceDto: UpdateAttendanceDto) {
    const { userId, ...rest } = updateAttendanceDto;

    try {
      return await this.prisma.attendanceLog.update({
        where: { id: BigInt(id) },
        data: {
          ...rest,
          ...(userId && { userId: BigInt(userId) }),
        },
      });
    } catch (error) {
      throw new NotFoundException(`Attendance log with ID ${id} not found`);
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.attendanceLog.delete({
        where: { id: BigInt(id) },
      });
    } catch (error) {
      throw new NotFoundException(`Attendance log with ID ${id} not found`);
    }
  }

  async salesCheckIn(userId: number, dto: SalesCheckInDto) {
    const checkInTime = dto.checkInTime ? new Date(dto.checkInTime) : new Date();

    // Calculate late status from active policy
    const policy = await this.prisma.hrPolicy.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    let isLate = false;
    let lateMinutes: number | null = null;
    let penaltyAmount: number | null = null;

    if (policy) {
      const [startH, startM] = policy.shiftStartTime.split(':').map(Number);
      const deadline = new Date(checkInTime);
      deadline.setHours(startH, startM + (policy.graceMinutes ?? 0), 0, 0);

      if (checkInTime > deadline) {
        isLate = true;
        lateMinutes = Math.max(1, Math.floor((checkInTime.getTime() - deadline.getTime()) / 60000));
        penaltyAmount = (Number(policy.penaltyPerHour) * lateMinutes) / 60;
      }
    }

    return this.prisma.attendanceLog.create({
      data: {
        userId: BigInt(userId),
        checkInTime,
        checkInLocation: dto.checkInLocation ?? null,
        notes: dto.notes ?? null,
        isLate,
        lateMinutes,
        penaltyAmount: penaltyAmount !== null ? penaltyAmount : undefined,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async salesCheckOut(userId: number, dto: SalesCheckOutDto) {
    const openLog = await this.prisma.attendanceLog.findFirst({
      where: {
        userId: BigInt(userId),
        checkOutTime: null,
      },
      orderBy: { checkInTime: 'desc' },
    });

    if (!openLog) {
      throw new BadRequestException('No open check-in found for this sales account');
    }

    const checkOutTime = dto.checkOutTime ? new Date(dto.checkOutTime) : new Date();
    const workDuration = Math.max(
      0,
      Math.round((checkOutTime.getTime() - new Date(openLog.checkInTime).getTime()) / 60000),
    );

    return this.prisma.attendanceLog.update({
      where: { id: openLog.id },
      data: {
        checkOutTime,
        checkOutLocation: dto.checkOutLocation ?? null,
        notes: dto.notes ? [openLog.notes, dto.notes].filter(Boolean).join('\n') : openLog.notes,
        workDuration,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }
}
