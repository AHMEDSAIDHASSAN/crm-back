import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { SetSalaryDto } from './dto/set-salary.dto';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { createPaginatedResponse } from '../common/pagination.interface';
import { Prisma } from '@prisma/client';

@Injectable()
export class HrService {
  constructor(private prisma: PrismaService) {}

  /** All employees with attendance summary + performance (cold calls, meetings, late count). */
  async getEmployees(paginationDto: PaginationDto = {}) {
    const { page = 1, limit = 10, search } = paginationDto;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      ...(search && {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          salary: true,
          status: true,
          role: { select: { name: true, displayName: true } },
          team: { select: { id: true, name: true } },
          _count: {
            select: {
              callLogs: true,
              meetings: true,
              attendanceLogs: true,
            },
          },
        },
        orderBy: { firstName: 'asc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const userIds = users.map((u) => u.id);

    const lateRows = await this.prisma.attendanceLog.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, isLate: true },
      _count: { id: true },
    });
    const lateMap = new Map(lateRows.map((r) => [r.userId.toString(), r._count.id]));

    const totalPenalties = await this.prisma.attendanceLog.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, penaltyAmount: { not: null } },
      _sum: { penaltyAmount: true },
    });
    const penaltyMap = new Map(
      totalPenalties.map((r) => [r.userId.toString(), Number(r._sum.penaltyAmount ?? 0)]),
    );

    const data = users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone,
      salary: u.salary,
      status: u.status,
      role: u.role,
      team: u.team,
      performance: {
        coldCalls: u._count.callLogs,
        meetings: u._count.meetings,
        totalAttendance: u._count.attendanceLogs,
        lateCount: lateMap.get(u.id.toString()) ?? 0,
        totalPenalty: penaltyMap.get(u.id.toString()) ?? 0,
      },
    }));

    return createPaginatedResponse(data, total, page, limit);
  }

  /** Strip salary from response for non-HR/non-super_admin. */
  async getEmployeesPublic(paginationDto: PaginationDto = {}) {
    const res = await this.getEmployees(paginationDto);
    res.data = res.data.map(({ salary, ...rest }: any) => rest);
    return res;
  }

  async setSalary(userId: number, dto: SetSalaryDto) {
    const user = await this.prisma.user.findUnique({ where: { id: BigInt(userId) } });
    if (!user) throw new NotFoundException(`User #${userId} not found`);
    return this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: { salary: dto.salary },
      select: { id: true, firstName: true, lastName: true, salary: true },
    });
  }

  // ── Policies ──

  async getPolicies() {
    return this.prisma.hrPolicy.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async getActivePolicy() {
    return this.prisma.hrPolicy.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
  }

  async createPolicy(dto: CreatePolicyDto) {
    return this.prisma.hrPolicy.create({
      data: {
        name: dto.name,
        shiftStartTime: dto.shiftStartTime,
        shiftEndTime: dto.shiftEndTime,
        graceMinutes: dto.graceMinutes ?? 0,
        penaltyPerHour: dto.penaltyPerHour,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updatePolicy(id: number, dto: UpdatePolicyDto) {
    try {
      return await this.prisma.hrPolicy.update({ where: { id }, data: dto as any });
    } catch {
      throw new NotFoundException(`Policy #${id} not found`);
    }
  }

  async deletePolicy(id: number) {
    try {
      return await this.prisma.hrPolicy.delete({ where: { id } });
    } catch {
      throw new NotFoundException(`Policy #${id} not found`);
    }
  }

  // ── Payroll ──

  async getPayrollSummary() {
    const activePolicy = await this.getActivePolicy();
    const users = await this.prisma.user.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        salary: true,
        role: { select: { name: true, displayName: true } },
        team: { select: { name: true } },
      },
      orderBy: { firstName: 'asc' },
    });

    const userIds = users.map((u) => u.id);

    const lateRows = await this.prisma.attendanceLog.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, isLate: true },
      _count: { id: true },
      _sum: { lateMinutes: true },
    });
    const lateMap = new Map(
      lateRows.map((r) => [
        r.userId.toString(),
        { count: r._count.id, totalMinutes: r._sum.lateMinutes ?? 0 },
      ]),
    );

    const penaltySums = await this.prisma.attendanceLog.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, penaltyAmount: { not: null } },
      _sum: { penaltyAmount: true },
    });
    const penaltyMap = new Map(
      penaltySums.map((r) => [r.userId.toString(), Number(r._sum.penaltyAmount ?? 0)]),
    );

    return {
      policy: activePolicy,
      employees: users.map((u) => {
        const salary = Number(u.salary ?? 0);
        const late = lateMap.get(u.id.toString()) ?? { count: 0, totalMinutes: 0 };
        const storedPenalty = penaltyMap.get(u.id.toString()) ?? 0;

        let calculatedPenalty = storedPenalty;
        if (activePolicy && storedPenalty === 0 && late.totalMinutes > 0) {
          const lateHours = late.totalMinutes / 60;
          calculatedPenalty = Math.round(lateHours * Number(activePolicy.penaltyPerHour) * 100) / 100;
        }

        return {
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          team: u.team,
          salary,
          lateCount: late.count,
          totalLateMinutes: late.totalMinutes,
          totalPenalty: calculatedPenalty,
          netSalary: Math.max(0, salary - calculatedPenalty),
        };
      }),
    };
  }

  async getEmployeeProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      include: {
        role: { select: { name: true, displayName: true } },
        team: { select: { id: true, name: true } },
      },
    });

    if (!user) throw new NotFoundException(`User #${userId} not found`);

    const id = BigInt(userId);

    const [attendance, deductions, commissions] = await Promise.all([
      this.prisma.attendanceLog.findMany({
        where: { userId: id },
        orderBy: { checkInTime: 'desc' },
      }),
      this.prisma.salesSalaryDeduction.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.salesCommission.findMany({
        where: { userId: id },
        orderBy: { saleDate: 'desc' },
      }),
    ]);

    const deductionsTotal = deductions.reduce((sum, d) => sum + Number(d.amount), 0);
    const basicSalary = Number(user.salary ?? 0);
    
    // Calculate late minutes and penalties from attendance
    const activePolicy = await this.prisma.hrPolicy.findFirst({ where: { isActive: true } });
    let totalLateMins = 0;
    let lateCount = 0;

    if (activePolicy) {
      const policyStart = activePolicy.shiftStartTime;
      const [pHe, pMe] = policyStart.split(':').map(Number);
      const grace = activePolicy.graceMinutes;

      for (const log of attendance) {
        const ci = log.checkInTime;
        const actualH = ci.getHours();
        const actualM = ci.getMinutes();
        const actualTotal = actualH * 60 + actualM;
        const expectedTotal = pHe * 60 + pMe;
        const diff = actualTotal - expectedTotal;
        if (diff > grace) {
          totalLateMins += diff;
          lateCount++;
        }
      }
    }

    return {
      user: {
        id: user.id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        title: user.title,
        role: user.role,
        team: user.team,
        salary: basicSalary,
      },
      stats: {
        lateCount,
        totalLateMins,
        deductionsTotal,
        netAfterDeductions: Math.max(0, basicSalary - deductionsTotal),
        commissionsPendingCount: commissions.filter(c => c.status === 'pending_collection').length,
        commissionsCollectedCount: commissions.filter(c => c.status === 'collected').length,
      },
      attendance: attendance.map(a => ({
        ...a,
        id: a.id.toString(),
        userId: a.userId.toString(),
      })),
      deductions: deductions.map(d => ({
        ...d,
        id: d.id.toString(),
        userId: d.userId.toString(),
        amount: Number(d.amount),
      })),
      commissions: commissions.map(c => ({
        ...c,
        id: c.id.toString(),
        userId: c.userId.toString(),
        amount: c.amount ? Number(c.amount) : null,
      })),
    };
  }
}
