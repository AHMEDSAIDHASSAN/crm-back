import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePreviewDto } from './dto/create-preview.dto';

function pv(prisma: PrismaService) {
  return (prisma as any).unitPreview as {
    create: (...args: any[]) => Promise<any>;
    findMany: (...args: any[]) => Promise<any>;
    findUnique: (...args: any[]) => Promise<any>;
    update: (...args: any[]) => Promise<any>;
  };
}

/** Previews that still reserve the unit for a time window (not finished / not cancelled). */
const BLOCKING_PREVIEW_STATUSES = ['pending', 'scheduled', 'checked_in'] as const;

function addMinutes(d: Date, min: number): Date {
  return new Date(d.getTime() + min * 60_000);
}

function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

function previewTimeWindow(scheduledAt: Date, durationMin: number | null | undefined): { start: Date; end: Date } {
  const start = new Date(scheduledAt);
  const dur = durationMin != null && durationMin > 0 ? durationMin : 60;
  return { start, end: addMinutes(start, dur) };
}

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: { select: { name: true, displayName: true } },
} as const;

function requirePreviewGps(
  lat: unknown,
  lng: unknown,
  action: 'check-in' | 'check-out',
): { lat: number; lng: number } {
  const la = typeof lat === 'number' ? lat : lat != null ? Number(lat) : NaN;
  const ln = typeof lng === 'number' ? lng : lng != null ? Number(lng) : NaN;
  if (!Number.isFinite(la) || !Number.isFinite(ln)) {
    throw new BadRequestException(
      `Current GPS location is required for ${action}. Enable location services, allow the browser to access your position, then try again.`,
    );
  }
  if (Math.abs(la) > 90 || Math.abs(ln) > 180) {
    throw new BadRequestException('GPS coordinates are out of valid range.');
  }
  return { lat: la, lng: ln };
}

const previewInclude = {
  unit: {
    select: {
      id: true,
      code: true,
      projectName: true,
      location: true,
      unitType: true,
      address: true,
      createdBy: true,
      creator: { select: { firstName: true, lastName: true } },
    },
  },
  requestedBy: { select: userSelect },
} as const;

@Injectable()
export class UnitPreviewsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /** First overlapping blocking preview for this unit and time window, if any. */
  private async findOverlappingBlockingPreview(
    unitId: bigint,
    slotStart: Date,
    slotEnd: Date,
    excludePreviewId?: bigint,
  ) {
    const blocking = await pv(this.prisma).findMany({
      where: {
        unitId,
        status: { in: [...BLOCKING_PREVIEW_STATUSES] },
        ...(excludePreviewId != null ? { id: { not: excludePreviewId } } : {}),
      },
      include: { requestedBy: { select: { firstName: true, lastName: true } } },
    });
    for (const p of blocking) {
      const { start, end } = previewTimeWindow(p.scheduledAt, p.durationMin);
      if (intervalsOverlap(slotStart, slotEnd, start, end)) {
        return p;
      }
    }
    return null;
  }

  conflictMessage(conflict: {
    requestedBy?: { firstName?: string | null; lastName?: string | null } | null;
    scheduledAt: Date;
    durationMin?: number | null;
  }): string {
    const rb = conflict.requestedBy;
    const name = `${rb?.firstName ?? ''} ${rb?.lastName ?? ''}`.trim() || 'another team member';
    const { start, end } = previewTimeWindow(conflict.scheduledAt, conflict.durationMin);
    const from = start.toISOString();
    const to = end.toISOString();
    return (
      `This unit is not available at that time — it is assigned to ${name} for a preview ` +
      `(${from} – ${to}). Please choose a different time.`
    );
  }

  async checkAvailability(
    unitId: number,
    scheduledAt: string,
    durationMin: number,
    excludePreviewId?: number,
  ) {
    const unit = await this.prisma.unit.findUnique({ where: { id: BigInt(unitId) } });
    if (!unit) throw new NotFoundException('Unit not found');
    if (!unit.isPublished) {
      throw new BadRequestException(
        'Previews are only for published units. Publish this listing in inventory first, then pick a time.',
      );
    }

    const slotStart = new Date(scheduledAt);
    if (Number.isNaN(slotStart.getTime())) {
      throw new BadRequestException('Invalid scheduled date/time');
    }
    const dur = Math.max(5, Number.isFinite(durationMin) ? durationMin : 60);
    const slotEnd = addMinutes(slotStart, dur);

    const conflict = await this.findOverlappingBlockingPreview(
      BigInt(unitId),
      slotStart,
      slotEnd,
      excludePreviewId != null ? BigInt(excludePreviewId) : undefined,
    );

    if (!conflict) {
      return { available: true as const };
    }

    const rb = conflict.requestedBy;
    const assignedToName = `${rb?.firstName ?? ''} ${rb?.lastName ?? ''}`.trim() || 'Another user';
    const { start, end } = previewTimeWindow(conflict.scheduledAt, conflict.durationMin);

    return {
      available: false as const,
      conflict: {
        previewId: conflict.id.toString(),
        assignedToName,
        scheduledAt: start.toISOString(),
        endsAt: end.toISOString(),
        durationMin: conflict.durationMin ?? 60,
        status: conflict.status,
        clientName: conflict.clientName,
      },
    };
  }

  async create(dto: CreatePreviewDto, userId: number) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: BigInt(dto.unitId) },
    });
    if (!unit) throw new NotFoundException('Unit not found');
    if (!unit.isPublished) {
      throw new BadRequestException(
        'Preview showings can only be requested for published units (use Published inventory).',
      );
    }

    const durationMin = dto.durationMin ?? 60;
    const slotStart = new Date(dto.scheduledAt);
    if (Number.isNaN(slotStart.getTime())) {
      throw new BadRequestException('Invalid scheduled date/time');
    }
    const slotEnd = addMinutes(slotStart, Math.max(5, durationMin));

    const overlap = await this.findOverlappingBlockingPreview(unit.id, slotStart, slotEnd);
    if (overlap) {
      throw new BadRequestException(this.conflictMessage(overlap));
    }

    const isOwner = String(unit.createdBy) === String(userId);

    const preview = await pv(this.prisma).create({
      data: {
        unitId: BigInt(dto.unitId),
        requestedById: BigInt(userId),
        clientName: dto.clientName.trim(),
        clientPhone: dto.clientPhone?.trim() || null,
        scheduledAt: new Date(dto.scheduledAt),
        durationMin: dto.durationMin ?? 60,
        notes: dto.notes?.trim() || null,
        status: isOwner ? 'scheduled' : 'pending',
      },
      include: previewInclude,
    });

    const requesterName = `${preview.requestedBy?.firstName || ''} ${preview.requestedBy?.lastName || ''}`.trim();

    if (!isOwner) {
      await this.notifications.createAndEmit({
        userId: Number(unit.createdBy),
        type: 'preview_requested' as any,
        title: `New preview request on ${unit.code}`,
        message: `${requesterName} wants to preview unit ${unit.code} with client "${dto.clientName}"`,
        relatedEntityType: 'unit_preview',
        relatedEntityId: preview.id,
      });
    }

    return preview;
  }

  async findAll(filters?: {
    unitId?: number;
    status?: string;
    requestedById?: number;
    q?: string;
    salesId?: number;
    teamId?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (filters?.unitId) where.unitId = BigInt(filters.unitId);
    if (filters?.status) where.status = filters.status;
    if (filters?.requestedById) where.requestedById = BigInt(filters.requestedById);
    if (filters?.salesId || filters?.teamId || filters?.q) {
      const unitAnd: Record<string, unknown>[] = [];
      if (filters.salesId) unitAnd.push({ createdBy: BigInt(filters.salesId) });
      if (filters.teamId) unitAnd.push({ creator: { is: { teamId: BigInt(filters.teamId) } } });
      if (filters.q) {
        unitAnd.push({
          OR: [
            { code: { contains: filters.q } },
            { projectName: { contains: filters.q } },
            { location: { contains: filters.q } },
            { address: { contains: filters.q } },
          ],
        });
        where.OR = [
          { clientName: { contains: filters.q } },
          { notes: { contains: filters.q } },
        ];
      }
      where.unit = { is: { AND: unitAnd } };
    }

    return pv(this.prisma).findMany({
      where,
      include: previewInclude,
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async findForUnitOwner(
    ownerUserId: number,
    filters?: { q?: string; salesId?: number; teamId?: number },
  ) {
    const andClauses: Record<string, unknown>[] = [{ createdBy: BigInt(ownerUserId) }];
    if (filters?.salesId) andClauses.push({ createdBy: BigInt(filters.salesId) });
    if (filters?.teamId) andClauses.push({ creator: { is: { teamId: BigInt(filters.teamId) } } });
    if (filters?.q) {
      andClauses.push({
        OR: [
          { code: { contains: filters.q } },
          { projectName: { contains: filters.q } },
          { location: { contains: filters.q } },
          { address: { contains: filters.q } },
        ],
      });
    }
    return pv(this.prisma).findMany({
      where: {
        ...(filters?.q
          ? {
              OR: [
                { clientName: { contains: filters.q } },
                { notes: { contains: filters.q } },
              ],
            }
          : {}),
        unit: { is: { AND: andClauses } },
      },
      include: previewInclude,
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const preview = await pv(this.prisma).findUnique({
      where: { id: BigInt(id) },
      include: previewInclude,
    });
    if (!preview) throw new NotFoundException('Preview not found');
    return preview;
  }

  /** Requester, unit owner, or operations admin only. */
  async findOneForViewer(id: number, viewerUserId: number, viewerRole?: string) {
    const preview = await this.findOne(id);
    const adminRoles = ['super_admin', 'operation_manager', 'sales_manager', 'tech_lead'];
    const isElevated = viewerRole && adminRoles.includes(viewerRole);
    const isRequester = String(preview.requestedById) === String(viewerUserId);
    const unitCreatedBy = preview.unit?.createdBy != null ? String(preview.unit.createdBy) : '';
    const isOwner = unitCreatedBy !== '' && unitCreatedBy === String(viewerUserId);
    if (!isElevated && !isRequester && !isOwner) {
      throw new ForbiddenException('You cannot view this preview');
    }
    return preview;
  }

  async approve(id: number, userId: number) {
    const preview = await pv(this.prisma).findUnique({
      where: { id: BigInt(id) },
      include: {
        unit: { select: { createdBy: true, code: true, isPublished: true } },
        requestedBy: { select: userSelect },
      },
    });
    if (!preview) throw new NotFoundException('Preview not found');
    if (String(preview.unit.createdBy) !== String(userId)) {
      throw new ForbiddenException('Only the unit owner can approve this preview');
    }
    if (preview.status !== 'pending') {
      throw new BadRequestException('Only pending previews can be approved');
    }
    if (!preview.unit.isPublished) {
      throw new BadRequestException(
        'This unit is not published. Only live inventory can be previewed — publish the unit first, then approve.',
      );
    }

    const dur = preview.durationMin ?? 60;
    const slotStart = new Date(preview.scheduledAt);
    const slotEnd = addMinutes(slotStart, Math.max(5, dur));
    const overlap = await this.findOverlappingBlockingPreview(
      preview.unitId,
      slotStart,
      slotEnd,
      BigInt(id),
    );
    if (overlap) {
      throw new BadRequestException(this.conflictMessage(overlap));
    }

    const result = await pv(this.prisma).update({
      where: { id: BigInt(id) },
      data: { status: 'scheduled' },
      include: previewInclude,
    });

    await this.notifications.createAndEmit({
      userId: Number(preview.requestedById),
      type: 'preview_approved' as any,
      title: `Preview approved for ${preview.unit.code}`,
      message: `Your preview request for unit ${preview.unit.code} has been approved. You can now check in.`,
      relatedEntityType: 'unit_preview',
      relatedEntityId: id,
    });

    return result;
  }

  async reject(id: number, userId: number) {
    const preview = await pv(this.prisma).findUnique({
      where: { id: BigInt(id) },
      include: { unit: { select: { createdBy: true, code: true } }, requestedBy: { select: userSelect } },
    });
    if (!preview) throw new NotFoundException('Preview not found');
    if (String(preview.unit.createdBy) !== String(userId)) {
      throw new ForbiddenException('Only the unit owner can reject this preview');
    }
    if (preview.status !== 'pending') {
      throw new BadRequestException('Only pending previews can be rejected');
    }

    const result = await pv(this.prisma).update({
      where: { id: BigInt(id) },
      data: { status: 'cancelled' },
      include: previewInclude,
    });

    await this.notifications.createAndEmit({
      userId: Number(preview.requestedById),
      type: 'preview_rejected' as any,
      title: `Preview rejected for ${preview.unit.code}`,
      message: `Your preview request for unit ${preview.unit.code} has been rejected by the unit owner.`,
      relatedEntityType: 'unit_preview',
      relatedEntityId: id,
    });

    return result;
  }

  async checkIn(id: number, userId: number, lat?: number, lng?: number) {
    const preview = await pv(this.prisma).findUnique({
      where: { id: BigInt(id) },
      include: {
        unit: { select: { createdBy: true, code: true, isPublished: true } },
        requestedBy: { select: userSelect },
      },
    });
    if (!preview) throw new NotFoundException('Preview not found');
    if (String(preview.requestedById) !== String(userId)) {
      throw new ForbiddenException('Only the person who scheduled this preview can check in');
    }
    if (preview.status !== 'scheduled') {
      throw new BadRequestException('Only scheduled previews can be checked in');
    }
    if (!preview.unit.isPublished) {
      throw new BadRequestException(
        'Cannot check in — this unit is no longer published. Publish it again or cancel the preview.',
      );
    }

    const gps = requirePreviewGps(lat, lng, 'check-in');

    const result = await pv(this.prisma).update({
      where: { id: BigInt(id) },
      data: {
        status: 'checked_in',
        checkInAt: new Date(),
        checkInLat: gps.lat,
        checkInLng: gps.lng,
      },
      include: previewInclude,
    });

    const requesterName = `${preview.requestedBy?.firstName || ''} ${preview.requestedBy?.lastName || ''}`.trim();

    if (String(preview.unit.createdBy) !== String(userId)) {
      await this.notifications.createAndEmit({
        userId: Number(preview.unit.createdBy),
        type: 'preview_checked_in' as any,
        title: `Check-in on ${preview.unit.code}`,
        message: `${requesterName} checked in to preview unit ${preview.unit.code}`,
        relatedEntityType: 'unit_preview',
        relatedEntityId: id,
      });
    }

    const admins = await this.prisma.user.findMany({
      where: { role: { name: 'super_admin' } },
      select: { id: true },
    } as any);
    for (const admin of admins) {
      if (String(admin.id) !== String(userId)) {
        await this.notifications.createAndEmit({
          userId: Number(admin.id),
          type: 'preview_checked_in' as any,
          title: `Check-in on ${preview.unit.code}`,
          message: `${requesterName} checked in to preview unit ${preview.unit.code}`,
          relatedEntityType: 'unit_preview',
          relatedEntityId: id,
        });
      }
    }

    return result;
  }

  async checkOut(id: number, userId: number, lat?: number, lng?: number) {
    const preview = await pv(this.prisma).findUnique({
      where: { id: BigInt(id) },
      include: { unit: { select: { createdBy: true, code: true } }, requestedBy: { select: userSelect } },
    });
    if (!preview) throw new NotFoundException('Preview not found');
    if (String(preview.requestedById) !== String(userId)) {
      throw new ForbiddenException('Only the person who scheduled this preview can check out');
    }
    if (preview.status !== 'checked_in') {
      throw new BadRequestException('Only checked-in previews can be checked out');
    }

    const gps = requirePreviewGps(lat, lng, 'check-out');

    const result = await pv(this.prisma).update({
      where: { id: BigInt(id) },
      data: {
        status: 'checked_out',
        checkOutAt: new Date(),
        checkOutLat: gps.lat,
        checkOutLng: gps.lng,
      },
      include: previewInclude,
    });

    const requesterName = `${preview.requestedBy?.firstName || ''} ${preview.requestedBy?.lastName || ''}`.trim();

    if (String(preview.unit.createdBy) !== String(userId)) {
      await this.notifications.createAndEmit({
        userId: Number(preview.unit.createdBy),
        type: 'preview_checked_out' as any,
        title: `Check-out on ${preview.unit.code}`,
        message: `${requesterName} checked out of unit ${preview.unit.code}`,
        relatedEntityType: 'unit_preview',
        relatedEntityId: id,
      });
    }

    const admins = await this.prisma.user.findMany({
      where: { role: { name: 'super_admin' } },
      select: { id: true },
    } as any);
    for (const admin of admins) {
      if (String(admin.id) !== String(userId)) {
        await this.notifications.createAndEmit({
          userId: Number(admin.id),
          type: 'preview_checked_out' as any,
          title: `Check-out on ${preview.unit.code}`,
          message: `${requesterName} checked out of unit ${preview.unit.code}`,
          relatedEntityType: 'unit_preview',
          relatedEntityId: id,
        });
      }
    }

    return result;
  }

  async cancel(id: number, userId: number) {
    const preview = await pv(this.prisma).findUnique({
      where: { id: BigInt(id) },
      include: { unit: { select: { createdBy: true, code: true } }, requestedBy: { select: userSelect } },
    });
    if (!preview) throw new NotFoundException('Preview not found');
    if (String(preview.requestedById) !== String(userId)) {
      throw new ForbiddenException('Only the requester can cancel a preview');
    }
    if (!['pending', 'scheduled'].includes(preview.status)) {
      throw new BadRequestException('Only pending or scheduled previews can be cancelled');
    }

    const result = await pv(this.prisma).update({
      where: { id: BigInt(id) },
      data: { status: 'cancelled' },
      include: previewInclude,
    });

    const requesterName = `${preview.requestedBy?.firstName || ''} ${preview.requestedBy?.lastName || ''}`.trim();

    if (String(preview.unit.createdBy) !== String(userId)) {
      await this.notifications.createAndEmit({
        userId: Number(preview.unit.createdBy),
        type: 'preview_cancelled' as any,
        title: `Preview cancelled for ${preview.unit.code}`,
        message: `${requesterName} cancelled the preview request for unit ${preview.unit.code}`,
        relatedEntityType: 'unit_preview',
        relatedEntityId: id,
      });
    }

    return result;
  }
}
