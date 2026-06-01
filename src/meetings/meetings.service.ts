import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { assertCanAccessUser, getReachableUserIds, getVisibleTeamIds } from '../common/subordinates.helper';
import { PrismaService } from '../config/prisma.service';
import { LeadStatus } from '@prisma/client';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { createPaginatedResponse } from '../common/pagination.interface';

/** Map old DB values from the checkin/checkout experiment to the current lifecycle enum (for API JSON). */
function presentMeetingStatus(status: string, startedAt: Date | null): string {
  if (status === 'checkin') return startedAt ? 'in_progress' : 'scheduled';
  if (status === 'checkout') return 'completed';
  return status;
}

function presentMeetingRow<T extends { status: string; startedAt: Date | null }>(m: T): T {
  return { ...m, status: presentMeetingStatus(m.status, m.startedAt) } as T;
}

@Injectable()
export class MeetingsService {
  constructor(private prisma: PrismaService) { }

  private async getSubordinateUserIds(currentUserId: number, currentRole: string): Promise<bigint[] | null> {
    return getReachableUserIds(this.prisma, currentUserId, currentRole);
  }

  /** Meeting stats for super_admin / operation_manager: total, completed, by team, by role, by user. */
  async getStats(currentUserId: number, currentRole: string) {
    const subordinateIds = await this.getSubordinateUserIds(currentUserId, currentRole);
    const where: any = subordinateIds === null ? {} : { scheduledBy: { in: subordinateIds } };

    const [total, completed, meetingsWithMeta] = await Promise.all([
      this.prisma.meeting.count({ where }),
      this.prisma.meeting.count({ where: { ...where, status: 'completed' } }),
      this.prisma.meeting.findMany({
        where,
        select: {
          status: true,
          scheduler: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: { select: { name: true } },
              teamId: true,
              team: { select: { name: true } },
            },
          },
          lead: { select: { teamId: true, team: { select: { name: true } } } },
        },
      }),
    ]);

    const byTeam: Record<string, { name: string; count: number }> = {};
    const byRole: Record<string, number> = {};
    const byUser: Record<string, { name: string; count: number }> = {};

    for (const m of meetingsWithMeta) {
      const teamName = m.lead?.team?.name ?? m.scheduler?.team?.name ?? 'No team';
      const teamKey = String(m.lead?.teamId ?? m.scheduler?.teamId ?? 'none');
      if (!byTeam[teamKey]) byTeam[teamKey] = { name: teamName, count: 0 };
      byTeam[teamKey].count += 1;

      const roleName = m.scheduler?.role?.name ?? 'unknown';
      byRole[roleName] = (byRole[roleName] ?? 0) + 1;

      const userId = String(m.scheduler?.id ?? '');
      const userName = m.scheduler ? `${m.scheduler.firstName ?? ''} ${m.scheduler.lastName ?? ''}`.trim() || 'Unknown' : 'Unknown';
      if (!byUser[userId]) byUser[userId] = { name: userName, count: 0 };
      byUser[userId].count += 1;
    }

    return {
      total,
      completed,
      byTeam: Object.entries(byTeam).map(([id, o]) => ({ teamId: id, ...o })),
      byRole: Object.entries(byRole).map(([role, count]) => ({ role, count })),
      byUser: Object.entries(byUser).map(([id, o]) => ({ userId: id, ...o })),
    };
  }

  /** Qualified leads: for super_admin all qualified; for others only those assigned to subordinate users (or self). Paginated. */
  async getQualifiedLeads(currentUserId: number, currentRole: string, page: number = 1, limit: number = 10) {
    const subordinateIds = await this.getSubordinateUserIds(currentUserId, currentRole);
    const skip = (page - 1) * limit;
    const where: any = { status: LeadStatus.qualified };
    if (subordinateIds === null) {
      where.assignedTo = { not: null };
    } else {
      where.assignedTo = { in: subordinateIds };
    }
    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          status: true,
          assignedTo: true,
          assignedUser: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.lead.count({ where }),
    ]);
    return createPaginatedResponse(data, total, page, limit);
  }

  async create(createMeetingDto: CreateMeetingDto, currentUserId: number | string, currentRole?: string) {
    const uid = Number(currentUserId);
    const role = currentRole ?? '';

    let scheduledBy: bigint;
    const rolesAllowExplicitScheduledBy = ['super_admin', 'operation_manager', 'tech_lead', 'sales_manager'];
    const useExplicit =
      createMeetingDto.scheduledBy != null && rolesAllowExplicitScheduledBy.includes(role);
    if (useExplicit) {
      const sid = Number(createMeetingDto.scheduledBy);
      await assertCanAccessUser(this.prisma, uid, role, sid);
      scheduledBy = BigInt(sid);
    } else {
      scheduledBy = BigInt(uid);
    }

    const leadIdBig = BigInt(Number(createMeetingDto.leadId));
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadIdBig },
      select: { id: true, assignedTo: true },
    });
    if (!lead) {
      throw new NotFoundException(`Lead with ID ${createMeetingDto.leadId} not found`);
    }
    if (lead.assignedTo == null) {
      throw new BadRequestException(
        'This lead has no assignee. Assign the lead to a sales user before scheduling a meeting.',
      );
    }
    if (lead.assignedTo !== scheduledBy) {
      throw new BadRequestException(
        'The meeting must be scheduled for the user currently assigned to this lead. Use "Schedule for" with that assignee (managers), or pick a lead assigned to you.',
      );
    }

    const meetingDate = createMeetingDto.meetingDate
      ? new Date(createMeetingDto.meetingDate)
      : new Date();
    const data: any = {
      leadId: leadIdBig,
      scheduledBy, // assignee of the lead (or self for sales)
      meetingDate,
      meetingType: createMeetingDto.meetingType,
      isPrivate: createMeetingDto.isPrivate ?? false,
    };
    if (createMeetingDto.location != null && createMeetingDto.location !== '') {
      data.location = String(createMeetingDto.location);
    }
    if (createMeetingDto.notes != null && createMeetingDto.notes !== '') {
      data.notes = String(createMeetingDto.notes);
    }
    if (createMeetingDto.status != null) {
      data.status = createMeetingDto.status;
    }
    const created = await this.prisma.meeting.create({
      data,
    });
    return presentMeetingRow(created);
  }

  async findAll(
    currentUserId?: number,
    currentRole?: string,
    page: number = 1,
    limit: number = 10,
    filterUserId?: string,
    filterTeamId?: string,
  ) {
    const role = currentRole ?? '';
    const subordinateIds = currentUserId != null && currentRole
      ? await this.getSubordinateUserIds(currentUserId, currentRole)
      : null;

    const conditions: any[] = [];

    /** Match meetings tied to a team via the lead and/or the scheduler (many leads have no team_id). */
    let canUseTeamFilter = false;
    if (filterTeamId) {
      const tid = BigInt(filterTeamId);
      if (['super_admin', 'operation_manager'].includes(role)) {
        canUseTeamFilter = true;
      } else if (currentUserId != null && ['sales_manager', 'tech_lead'].includes(role)) {
        const visible = await getVisibleTeamIds(this.prisma, currentUserId, role);
        if (visible !== null && visible.includes(tid)) {
          canUseTeamFilter = true;
        } else if (visible !== null) {
          throw new ForbiddenException('You cannot filter meetings by this team');
        }
      }
    }
    if (canUseTeamFilter && filterTeamId) {
      const tid = BigInt(filterTeamId);
      conditions.push({
        OR: [{ lead: { teamId: tid } }, { scheduler: { teamId: tid } }],
      });
    }

    if (filterUserId) {
      const target = BigInt(filterUserId);
      if (subordinateIds !== null && !subordinateIds.includes(target)) {
        throw new ForbiddenException('You cannot list meetings for this user');
      }
      conditions.push({ scheduledBy: target });
    } else if (subordinateIds !== null) {
      conditions.push({ scheduledBy: { in: subordinateIds } });
    }

    const where: any =
      conditions.length === 0
        ? {}
        : conditions.length === 1
          ? conditions[0]
          : { AND: conditions };

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.meeting.findMany({
        where,
        skip,
        take: limit,
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              status: true,
              teamId: true,
              team: { select: { id: true, name: true } },
            },
          },
          scheduler: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              teamId: true,
              role: { select: { name: true, displayName: true } },
              team: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { meetingDate: 'desc' },
      }),
      this.prisma.meeting.count({ where }),
    ]);
    const presented = data.map((m) => presentMeetingRow(m));
    return createPaginatedResponse(presented, total, page, limit);
  }

  private async canAccessMeeting(meetingScheduledBy: bigint, currentUserId: number, currentRole: string): Promise<boolean> {
    if (currentRole === 'super_admin') return true;
    const subordinateIds = await this.getSubordinateUserIds(currentUserId, currentRole);
    if (subordinateIds === null) return true;
    return subordinateIds.includes(meetingScheduledBy);
  }

  async findOne(id: number, currentUserId?: number, currentRole?: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: BigInt(id) },
      include: {
        lead: true,
        scheduler: true,
      },
    });
    if (!meeting) {
      throw new NotFoundException(`Meeting with ID ${id} not found`);
    }
    if (currentUserId != null && currentRole) {
      const ok = await this.canAccessMeeting(meeting.scheduledBy, currentUserId, currentRole);
      if (!ok) throw new ForbiddenException('You cannot view this meeting');
    }
    return presentMeetingRow(meeting);
  }

  async update(id: number, updateMeetingDto: UpdateMeetingDto, currentUserId?: number, currentRole?: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: BigInt(id) } });
    if (!meeting) {
      throw new NotFoundException(`Meeting with ID ${id} not found`);
    }
    if (currentUserId != null && currentRole) {
      const ok = await this.canAccessMeeting(meeting.scheduledBy, currentUserId, currentRole);
      if (!ok) throw new ForbiddenException('You cannot update this meeting');
    }
    const { leadId, scheduledBy, startedAt, endedAt, ...rest } = updateMeetingDto;
    const data: any = {
      ...rest,
      ...(leadId != null && { leadId: BigInt(leadId) }),
      ...(scheduledBy != null && { scheduledBy: BigInt(scheduledBy) }),
      ...(startedAt != null && { startedAt: new Date(startedAt) }),
      ...(endedAt != null && { endedAt: new Date(endedAt) }),
    };
    const updated = await this.prisma.meeting.update({
      where: { id: BigInt(id) },
      data,
    });
    return presentMeetingRow(updated);
  }

  async remove(id: number, currentUserId?: number, currentRole?: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: BigInt(id) } });
    if (!meeting) {
      throw new NotFoundException(`Meeting with ID ${id} not found`);
    }
    if (currentUserId != null && currentRole) {
      const ok = await this.canAccessMeeting(meeting.scheduledBy, currentUserId, currentRole);
      if (!ok) throw new ForbiddenException('You cannot delete this meeting');
    }
    return this.prisma.meeting.delete({
      where: { id: BigInt(id) },
    });
  }
}
