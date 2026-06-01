import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';

/**
 * User IDs a viewer may act on or inspect (null = unrestricted, e.g. super_admin).
 * Mirrors meetings/leads hierarchy rules.
 */
export async function getReachableUserIds(
  prisma: PrismaService,
  viewerId: number,
  viewerRole: string,
): Promise<bigint[] | null> {
  const uid = BigInt(viewerId);
  if (viewerRole === 'super_admin') return null;
  if (viewerRole === 'operation_manager') {
    const users = await prisma.user.findMany({
      where: { role: { name: { in: ['sales_manager', 'tech_lead', 'sales'] } } },
      select: { id: true },
    });
    return users.map((u) => BigInt(u.id));
  }
  if (viewerRole === 'sales_manager') {
    const users = await prisma.user.findMany({
      where: { role: { name: { in: ['tech_lead', 'sales'] } } },
      select: { id: true },
    });
    return users.map((u) => BigInt(u.id));
  }
  if (viewerRole === 'tech_lead') {
    const me = await prisma.user.findUnique({
      where: { id: uid },
      select: { teamId: true },
    });
    const teamIds = new Set<bigint>();
    if (me?.teamId) teamIds.add(me.teamId);
    const ledTeams = await prisma.team.findMany({
      where: { teamLeaderId: uid },
      select: { id: true },
    });
    for (const t of ledTeams) teamIds.add(t.id);
    if (teamIds.size === 0) return [uid];
    const members = await prisma.user.findMany({
      where: { teamId: { in: [...teamIds] } },
      select: { id: true },
    });
    const out = new Set(members.map((u) => BigInt(u.id)));
    out.add(uid);
    return [...out];
  }
  return [uid];
}

/**
 * Team IDs visible to the viewer for listings / filters / team detail.
 * `null` = all teams (super_admin, operation_manager).
 */
export async function getVisibleTeamIds(
  prisma: PrismaService,
  viewerId: number,
  viewerRole: string,
): Promise<bigint[] | null> {
  if (viewerRole === 'super_admin' || viewerRole === 'operation_manager') {
    return null;
  }
  if (viewerRole === 'tech_lead') {
    const uid = BigInt(viewerId);
    const me = await prisma.user.findUnique({
      where: { id: uid },
      select: { teamId: true },
    });
    const teamIds = new Set<bigint>();
    if (me?.teamId) teamIds.add(me.teamId);
    const ledTeams = await prisma.team.findMany({
      where: { teamLeaderId: uid },
      select: { id: true },
    });
    for (const t of ledTeams) teamIds.add(t.id);
    return teamIds.size === 0 ? [] : [...teamIds];
  }
  if (viewerRole === 'sales_manager') {
    const reachable = await getReachableUserIds(prisma, viewerId, viewerRole);
    if (!reachable?.length) return [];
    const fromUsers = await prisma.user.findMany({
      where: { id: { in: reachable }, teamId: { not: null } },
      select: { teamId: true },
    });
    const ids = new Set<bigint>();
    for (const u of fromUsers) {
      if (u.teamId) ids.add(u.teamId);
    }
    const led = await prisma.team.findMany({
      where: { teamLeaderId: { in: reachable } },
      select: { id: true },
    });
    for (const t of led) ids.add(t.id);
    return [...ids];
  }
  return [];
}

export async function assertCanAccessUser(
  prisma: PrismaService,
  viewerId: number,
  viewerRole: string,
  targetUserId: number,
): Promise<void> {
  const target = BigInt(targetUserId);
  const reachable = await getReachableUserIds(prisma, viewerId, viewerRole);
  if (reachable === null) return;
  if (!reachable.includes(target)) {
    throw new ForbiddenException("You cannot view this user's data");
  }
}
