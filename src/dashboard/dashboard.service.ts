import { Injectable } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { getReachableUserIds } from '../common/subordinates.helper';

@Injectable()
export class DashboardService {
    constructor(private prisma: PrismaService) { }

    async getStats(currentUserId?: number, currentRole?: string) {
        const isSuperAdmin = currentRole === 'super_admin';
        const isOpsManager = currentRole === 'operation_manager';

        const reachable =
            currentUserId != null && currentRole
                ? await getReachableUserIds(this.prisma, Number(currentUserId), currentRole)
                : null;

        // Lead filter by role
        const leadWhere: any = {};
        if (currentRole && !isSuperAdmin && !isOpsManager) {
            const userId = BigInt(currentUserId!);
            if (currentRole === 'sales') {
                leadWhere.assignedTo = userId;
            } else if (currentRole === 'tech_lead') {
                leadWhere.OR = [
                    { assignedTo: userId },
                    { team: { teamLeaderId: userId } },
                ];
            } else if (reachable && reachable.length > 0) {
                leadWhere.assignedTo = { in: reachable };
            }
        }

        // Meeting filter
        let meetingWhere: any = {};
        if (!isSuperAdmin) {
            if (reachable === null) {
                meetingWhere = {};
            } else if (reachable.length === 0) {
                meetingWhere = { scheduledBy: { in: [] as bigint[] } };
            } else {
                meetingWhere = { scheduledBy: { in: reachable } };
            }
        }

        const [
            totalLeads,
            totalMeetings,
            totalCampaigns,
            totalAgents,
            convertedLeads,
            salesUsers,
        ] = await Promise.all([
            this.prisma.lead.count({ where: leadWhere }),
            this.prisma.meeting.count({ where: meetingWhere }),
            this.prisma.campaign.count(),
            this.prisma.user.count({
                where: { role: { name: { in: ['sales', 'tech_lead', 'sales_manager'] } }, status: 'active' },
            }),
            this.prisma.lead.count({ where: { ...leadWhere, status: 'purchased' } }),
            this.prisma.user.findMany({
                where: { role: { name: { in: ['sales', 'tech_lead'] } }, status: 'active' },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    _count: { select: { assignedLeads: true } },
                },
                take: 20,
            }),
        ]);

        // Build agentFleet
        const agentIds = salesUsers.map((u) => u.id);
        const converted = agentIds.length > 0
            ? await this.prisma.lead.groupBy({
                by: ['assignedTo'],
                where: { assignedTo: { in: agentIds }, status: 'purchased' },
                _count: { id: true },
            })
            : [];
        const convertedMap = new Map(converted.map((g) => [String(g.assignedTo), g._count.id]));

        const agentFleet = salesUsers.map((u) => {
            const assigned = u._count.assignedLeads;
            const conv = convertedMap.get(String(u.id)) ?? 0;
            return {
                id: String(u.id),
                name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
                load: assigned,
                conversionPct: assigned > 0 ? Number(((conv / assigned) * 100).toFixed(1)) : 0,
            };
        });

        return {
            kpis: {
                agents: totalAgents,
                campaigns: totalCampaigns,
                leads: totalLeads,
                meetings: totalMeetings,
            },
            summary: {
                totalLeads,
                totalMeetings,
                convertedLeads,
                conversionRate: totalLeads > 0 ? Number(((convertedLeads / totalLeads) * 100).toFixed(1)) : 0,
            },
            agentFleet,
        };
    }
}
