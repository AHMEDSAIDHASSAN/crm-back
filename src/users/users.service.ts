import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { assertCanAccessUser, getReachableUserIds } from '../common/subordinates.helper';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma, User, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PaginationDto } from '../common/dto/pagination.dto';
import { createPaginatedResponse, PaginatedResult } from '../common/pagination.interface';
import { VALID_ROLE_NAMES } from '../constants/roles';
import { LeadsService } from '../leads/leads.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private leadsService: LeadsService,
  ) { }

  private async validateRoleId(roleId: number): Promise<void> {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role || !VALID_ROLE_NAMES.includes(role.name as any)) {
      throw new BadRequestException(
        `Invalid role. Allowed roles: Super Admin, Operation Manager, Sales Manager, Tech Lead, Sales, Marketing, HR.`,
      );
    }
  }

  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'passwordHash'>> {
    await this.validateRoleId(createUserDto.roleId);

    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);
    const { password, ...userData } = createUserDto;
    const data: any = { ...userData, passwordHash };
    if (userData.teamId !== undefined) {
      data.teamId = userData.teamId == null ? null : BigInt(Number(userData.teamId));
    }

    const user = await this.prisma.user.create({
      data,
      include: {
        role: true,
        team: true,
      },
    });

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword as any;
  }

  private async userListWhereForViewer(
    viewerId: number,
    viewerRole: string,
  ): Promise<{ id: { in: bigint[] } } | Record<string, never>> {
    const reachable = await getReachableUserIds(this.prisma, viewerId, viewerRole);
    if (reachable === null) return {};
    if (reachable.length === 0) return { id: { in: [] } };
    return { id: { in: reachable } };
  }

  async findAll(
    paginationDto: PaginationDto = {},
    viewerId?: number,
    viewerRole?: string,
  ): Promise<PaginatedResult<Omit<User, 'passwordHash'>>> {
    const { page = 1, limit = 10, search } = paginationDto;
    const skip = (page - 1) * limit;

    const scopeWhere =
      viewerId != null && viewerRole
        ? await this.userListWhereForViewer(viewerId, viewerRole)
        : {};

    const where: Prisma.UserWhereInput = {
      ...scopeWhere,
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
        include: {
          role: true,
          team: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const usersWithoutPassword = users.map(({ passwordHash, ...user }) => user);
    return createPaginatedResponse(usersWithoutPassword as any, total, page, limit);
  }

  async findOne(id: number): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(id) },
      include: {
        role: true,
        team: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword as any;
  }

  async findOneForViewer(
    id: number,
    viewerId: number,
    viewerRole: string,
  ): Promise<Omit<User, 'passwordHash'>> {
    await assertCanAccessUser(this.prisma, viewerId, viewerRole, id);
    return this.findOne(id);
  }

  /** Leads assigned to user, meeting counts, and status breakdown (managers / TL / super_admin). */
  async getSalesOverview(
    targetUserId: number,
    viewerId: number,
    viewerRole: string,
    performanceRange: 'all' | 'week' | 'month' | 'year' = 'all',
  ) {
    await assertCanAccessUser(this.prisma, viewerId, viewerRole, targetUserId);
    const user = await this.findOne(targetUserId);
    const uid = BigInt(targetUserId);
    const now = new Date();
    const rangeStart =
      performanceRange === 'week'
        ? new Date(now.getTime() - 7 * 24 * 3600 * 1000)
        : performanceRange === 'month'
          ? new Date(now.getTime() - 30 * 24 * 3600 * 1000)
          : performanceRange === 'year'
            ? new Date(now.getTime() - 365 * 24 * 3600 * 1000)
            : null;
    const leadRangeWhere = rangeStart ? { updatedAt: { gte: rangeStart } } : {};
    const meetingRangeWhere = rangeStart ? { meetingDate: { gte: rangeStart } } : {};

    const [statusGroups, assignedTotal, meetingsTotal, meetingsCompleted, recentMeetings, recentLeads] =
      await Promise.all([
        this.prisma.lead.groupBy({
          by: ['status'],
          where: { assignedTo: uid, ...leadRangeWhere },
          _count: { id: true },
        }),
        this.prisma.lead.count({ where: { assignedTo: uid, ...leadRangeWhere } }),
        this.prisma.meeting.count({ where: { scheduledBy: uid, ...meetingRangeWhere } }),
        this.prisma.meeting.count({ where: { scheduledBy: uid, status: 'completed', ...meetingRangeWhere } }),
        this.prisma.meeting.findMany({
          where: { scheduledBy: uid, ...meetingRangeWhere },
          take: 25,
          orderBy: { meetingDate: 'desc' },
          include: {
            lead: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                status: true,
                team: { select: { id: true, name: true } },
              },
            },
          },
        }),
        this.prisma.lead.findMany({
          where: { assignedTo: uid, ...leadRangeWhere },
          take: 200,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            status: true,
            priority: true,
            assignedAt: true,
            updatedAt: true,
            teamId: true,
            team: { select: { id: true, name: true } },
          },
        }),
      ]);

    const leadsByStatus: Record<string, number> = {};
    for (const g of statusGroups) {
      leadsByStatus[g.status] = g._count.id;
    }

    return {
      user,
      performance: {
        range: performanceRange,
        assignedLeadsTotal: assignedTotal,
        leadsByStatus,
        meetingsTotal,
        meetingsCompleted,
        meetingsOpen: Math.max(0, meetingsTotal - meetingsCompleted),
      },
      recentAssignedLeads: recentLeads,
      recentMeetings,
    };
  }

  /**
   * Single bundle for sales profile: current assignee + prior assignment history.
   * Uses LeadsService internally (no GET /leads query DTO), so strict whitelist cannot block filters.
   */
  async getProfileLeadsBundle(
    targetUserId: number,
    viewerId: number,
    viewerRole: string,
    currentPage: number,
    priorPage: number,
    limitCurrent: number,
    limitPrior: number,
  ) {
    await assertCanAccessUser(this.prisma, viewerId, viewerRole, targetUserId);
    const sid = String(targetUserId);
    const [currentAssigned, previouslyAssigned] = await Promise.all([
      this.leadsService.findAll(
        { page: currentPage, limit: limitCurrent, assignedTo: sid },
        viewerId,
        viewerRole,
      ),
      this.leadsService.findAll(
        { page: priorPage, limit: limitPrior, previouslyAssignedTo: sid },
        viewerId,
        viewerRole,
      ),
    ]);
    return { currentAssigned, previouslyAssigned };
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    viewerId?: number,
    viewerRole?: string,
  ): Promise<Omit<User, 'passwordHash'>> {
    if (viewerId != null && viewerRole) {
      await assertCanAccessUser(this.prisma, viewerId, viewerRole, id);
    }
    const user = await this.findOne(id);

    if (updateUserDto.roleId !== undefined) {
      await this.validateRoleId(updateUserDto.roleId);
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }

    const { password, ...rest } = updateUserDto;
    const data: any = { ...rest };
    if (password && password.length >= 8) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }
    if (rest.teamId !== undefined) {
      data.teamId = rest.teamId == null ? null : BigInt(Number(rest.teamId));
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: BigInt(id) },
      data,
      include: {
        role: true,
        team: true,
      },
    });

    const { passwordHash: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword as any;
  }

  async remove(id: number, viewerId?: number, viewerRole?: string): Promise<void> {
    if (viewerId != null && viewerRole) {
      await assertCanAccessUser(this.prisma, viewerId, viewerRole, id);
    }
    await this.findOne(id);
    const userId = BigInt(id);

    await this.prisma.$transaction(async (tx) => {
      // Unassign leads and teams so FK constraints don't block delete
      await tx.lead.updateMany({ where: { assignedTo: userId }, data: { assignedTo: null, assignedAt: null } });
      await tx.team.updateMany({ where: { teamLeaderId: userId }, data: { teamLeaderId: null } });
      // Delete records that reference this user (required FKs)
      await tx.leadAssignment.deleteMany({ where: { assignedTo: userId } });
      await tx.leadAssignment.updateMany({ where: { assignedBy: userId }, data: { assignedBy: null } });
      await tx.leadFeedback.deleteMany({ where: { userId } });
      await tx.callLog.deleteMany({ where: { userId } });
      await tx.whatsappInteraction.deleteMany({ where: { userId } });
      await tx.meeting.deleteMany({ where: { scheduledBy: userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.leadAutoRetraction.deleteMany({ where: { previousOwner: userId } });
      await tx.leadAutoRetraction.updateMany({ where: { reassignedTo: userId }, data: { reassignedTo: null } });
      await tx.teamMember.deleteMany({ where: { userId } });
      await tx.attendanceLog.deleteMany({ where: { userId } });
      await tx.userSession.deleteMany({ where: { userId } });
      // DataBatch and LeadUpload: clear creator reference by deleting uploads then batches
      const batches = await tx.dataBatch.findMany({ where: { createdBy: userId }, select: { id: true } });
      const batchIds = batches.map((b) => b.id);
      if (batchIds.length > 0) {
        await tx.leadUpload.updateMany({ where: { dataBatchId: { in: batchIds } }, data: { dataBatchId: null } });
        await tx.lead.updateMany({ where: { dataBatchId: { in: batchIds } }, data: { dataBatchId: null } });
        await tx.dataBatch.deleteMany({ where: { createdBy: userId } });
      }
      await tx.leadUpload.deleteMany({ where: { uploadedBy: userId } });
      await tx.auditLog.updateMany({ where: { userId }, data: { userId: null } });
      await tx.unit.deleteMany({ where: { createdBy: userId } });
      await tx.resaleUnit.deleteMany({ where: { createdBy: userId } });
      await tx.user.delete({ where: { id: userId } });
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
        team: true,
      },
    }) as any;
  }

  async findRoleByName(name: string) {
    return this.prisma.role.findUnique({
      where: { name },
    });
  }

  async findByRole(
    roleName: string,
    viewerId?: number,
    viewerRole?: string,
  ): Promise<Omit<User, 'passwordHash'>[]> {
    const roleNames = roleName.split(',').map((n) => n.trim());
    const roleClause: Prisma.UserWhereInput = {
      role: { name: { in: roleNames } },
    };

    let where: Prisma.UserWhereInput;
    if (viewerId != null && viewerRole) {
      const scopeWhere = await this.userListWhereForViewer(viewerId, viewerRole);
      const keys = Object.keys(scopeWhere);
      where =
        keys.length === 0
          ? roleClause
          : { AND: [roleClause, scopeWhere] };
    } else {
      where = roleClause;
    }

    const users = await this.prisma.user.findMany({
      where,
      include: {
        role: true,
        team: true,
      },
      orderBy: { firstName: 'asc' },
    });

    return users.map(({ passwordHash, ...user }) => user) as any;
  }

  /** Tech leads and sales accounts the viewer may assign to teams (same scope as reachable users). */
  async findScopedTeamAssignees(viewerId: number, viewerRole: string) {
    const reachable = await getReachableUserIds(this.prisma, viewerId, viewerRole);
    const scope =
      reachable === null
        ? {}
        : reachable.length > 0
          ? { id: { in: reachable } }
          : { id: { in: [] as bigint[] } };

    const [techLeads, sales] = await Promise.all([
      this.prisma.user.findMany({
        where: { ...scope, role: { name: 'tech_lead' } },
        include: { role: true, team: true },
        orderBy: { firstName: 'asc' },
      }),
      this.prisma.user.findMany({
        where: { ...scope, role: { name: 'sales' } },
        include: { role: true, team: true },
        orderBy: { firstName: 'asc' },
      }),
    ]);

    const strip = (u: typeof techLeads[number]) => {
      const { passwordHash: _, ...rest } = u as any;
      return rest;
    };

    return {
      techLeads: techLeads.map(strip),
      sales: sales.map(strip),
    };
  }
}
