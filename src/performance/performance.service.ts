import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../config/prisma.service';
import { getReachableUserIds, getVisibleTeamIds } from '../common/subordinates.helper';

@Injectable()
export class PerformanceService {
  constructor(private prisma: PrismaService) {}

  private getPeriodBounds() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay(); // 0 Sun .. 6 Sat
    const diffToMonday = day === 0 ? 6 : day - 1;
    startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    return { startOfWeek, startOfMonth };
  }

  async getOverview(viewerId: number, viewerRole: string) {
    const reachable = await getReachableUserIds(this.prisma, viewerId, viewerRole);

    let targetIds: bigint[];
    if (reachable === null) {
      const rows = await this.prisma.user.findMany({
        where: { role: { name: { in: ['sales_manager', 'tech_lead', 'sales'] } } },
        select: { id: true },
      });
      targetIds = rows.map((r) => r.id);
    } else {
      targetIds = reachable;
    }

    const userWhere: Prisma.UserWhereInput =
      targetIds.length === 0 ? { id: { in: [] as bigint[] } } : { id: { in: targetIds } };
    /* Tech lead: only sales-pod roles on their team(s), not unrelated job titles */
    if (viewerRole === 'tech_lead') {
      userWhere.role = { name: { in: ['sales', 'marketing', 'tech_lead'] } };
    }

    const users = await this.prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        teamId: true,
        team: { select: { id: true, name: true } },
        role: { select: { name: true, displayName: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const metricIds = users.map((u) => u.id);

    const visibleTeamIds = await getVisibleTeamIds(this.prisma, viewerId, viewerRole);
    const teamWhere =
      visibleTeamIds === null ? {} : visibleTeamIds.length === 0 ? { id: { in: [] as bigint[] } } : { id: { in: visibleTeamIds } };
    const teamRows = await this.prisma.team.findMany({
      where: teamWhere,
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    const teams = teamRows.map((t) => ({ id: String(t.id), name: t.name }));

    if (metricIds.length === 0) {
      return { teams, rows: [] };
    }

    const { startOfWeek, startOfMonth } = this.getPeriodBounds();

    const [
      leadAssigned,
      leadConverted,
      meetingsTotal,
      meetingsCompleted,
      convertedWeek,
      convertedMonth,
      leadsByStatusRaw,
    ] = await Promise.all([
      this.prisma.lead.groupBy({
        by: ['assignedTo'],
        where: { assignedTo: { in: metricIds } },
        _count: { id: true },
      }),
      this.prisma.lead.groupBy({
        by: ['assignedTo'],
        where: { assignedTo: { in: metricIds }, status: 'purchased' },
        _count: { id: true },
      }),
      this.prisma.meeting.groupBy({
        by: ['scheduledBy'],
        where: { scheduledBy: { in: metricIds } },
        _count: { id: true },
      }),
      this.prisma.meeting.groupBy({
        by: ['scheduledBy'],
        where: { scheduledBy: { in: metricIds }, status: 'completed' },
        _count: { id: true },
      }),
      this.prisma.lead.groupBy({
        by: ['assignedTo'],
        where: {
          assignedTo: { in: metricIds },
          status: 'purchased',
          updatedAt: { gte: startOfWeek },
        },
        _count: { id: true },
      }),
      this.prisma.lead.groupBy({
        by: ['assignedTo'],
        where: {
          assignedTo: { in: metricIds },
          status: 'purchased',
          updatedAt: { gte: startOfMonth },
        },
        _count: { id: true },
      }),
      // leads per user per status
      this.prisma.lead.groupBy({
        by: ['assignedTo', 'status'],
        where: { assignedTo: { in: metricIds } },
        _count: { id: true },
      }),
    ]);

    const assignedMap = new Map<string, number>();
    for (const g of leadAssigned) {
      if (g.assignedTo != null) assignedMap.set(String(g.assignedTo), g._count.id);
    }
    const convertedMap = new Map<string, number>();
    for (const g of leadConverted) {
      if (g.assignedTo != null) convertedMap.set(String(g.assignedTo), g._count.id);
    }
    const mtMap = new Map<string, number>();
    for (const g of meetingsTotal) {
      mtMap.set(String(g.scheduledBy), g._count.id);
    }
    const mcMap = new Map<string, number>();
    for (const g of meetingsCompleted) {
      mcMap.set(String(g.scheduledBy), g._count.id);
    }
    const cwMap = new Map<string, number>();
    for (const g of convertedWeek) {
      if (g.assignedTo != null) cwMap.set(String(g.assignedTo), g._count.id);
    }
    const cmMap = new Map<string, number>();
    for (const g of convertedMonth) {
      if (g.assignedTo != null) cmMap.set(String(g.assignedTo), g._count.id);
    }

    // Build per-user leadsByStatus map
    const statusMap = new Map<string, Record<string, number>>();
    for (const g of leadsByStatusRaw) {
      if (g.assignedTo == null) continue;
      const uid = String(g.assignedTo);
      if (!statusMap.has(uid)) statusMap.set(uid, {});
      statusMap.get(uid)![g.status] = g._count.id;
    }

    const rows = users.map((u) => {
      const id = String(u.id);
      const assignedLeads = assignedMap.get(id) ?? 0;
      const convertedLeads = convertedMap.get(id) ?? 0;
      const meetingsTot = mtMap.get(id) ?? 0;
      const meetingsComp = mcMap.get(id) ?? 0;
      return {
        userId: id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: u.role,
        team: u.team,
        assignedLeads,
        convertedLeads,
        meetingsTotal: meetingsTot,
        meetingsCompleted: meetingsComp,
        meetingsOpen: Math.max(0, meetingsTot - meetingsComp),
        salesWeek: cwMap.get(id) ?? 0,
        salesMonth: cmMap.get(id) ?? 0,
        conversionRate: assignedLeads > 0 ? Number(((convertedLeads / assignedLeads) * 100).toFixed(1)) : 0,
        leadsByStatus: statusMap.get(id) ?? {},
      };
    });

    return { teams, rows };
  }
}
