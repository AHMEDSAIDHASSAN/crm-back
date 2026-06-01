import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { PublishUnitDto } from './dto/publish-unit.dto';
import { UNIT_FULL_ACCESS_ROLES } from '../constants/roles';
import { Prisma } from '@prisma/client';

const publisherSelect = {
  id: true,
  firstName: true,
  lastName: true,
} as const;

@Injectable()
export class UnitsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /** Sales may only read units they created or that are published. */
  private assertSalesCanViewUnit(
    unit: { createdBy: bigint; isPublished: boolean },
    viewerRole: string,
    viewerUserId: number,
  ) {
    if (viewerRole !== 'sales') return;
    if (Number(unit.createdBy) !== viewerUserId && !unit.isPublished) {
      throw new ForbiddenException('You cannot view this unit');
    }
  }

  /** Sales may only edit/delete units they uploaded. */
  private assertSalesCanMutateUnit(unit: { createdBy: bigint }, viewerRole: string, viewerUserId: number) {
    if (viewerRole !== 'sales') return;
    if (Number(unit.createdBy) !== viewerUserId) {
      throw new ForbiddenException('You can only edit or delete units you created');
    }
  }

  /**
   * Accepts either:
   * - plain URL string
   * - JSON string: { places: [{ name, link }, ...] }
   */
  private normalizePublishedLink(raw: string | undefined, isPublished: boolean): string | null {
    const trimmed = raw?.trim() || '';
    if (!isPublished) return null;
    if (!trimmed) {
      throw new BadRequestException('publishedLink is required when publishing');
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).places)) {
        const places = (parsed as any).places
          .map((p: any) => ({
            name: typeof p?.name === 'string' ? p.name.trim() : '',
            link: typeof p?.link === 'string' ? p.link.trim() : '',
          }))
          .filter((p: { name: string; link: string }) => p.name && p.link);

        if (places.length === 0) {
          throw new BadRequestException(
            'publishedLink JSON must contain at least one valid place (name + link)',
          );
        }
        return JSON.stringify({ places });
      }
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      // Not JSON => treat as legacy plain URL/text
    }

    if (trimmed.length < 8) {
      throw new BadRequestException('publishedLink is too short');
    }
    return trimmed;
  }

  private getCodePrefixFromUnitType(unitType?: string): string {
    const t = (unitType ?? '').trim().toLowerCase();
    if (t === 's' || t === 'shallea' || t === 'chalet') return 'S';
    if (t === 'v' || t === 'villa') return 'V';
    if (t === 'd' || t === 'department' || t === 'apartment') return 'D';
    if (t === 'st' || t === 'studio') return 'T';
    if (t === 'c' || t === 'commercial') return 'C';
    if (t === 'ph' || t === 'penthouse') return 'P';
    return 'U';
  }

  /** Unique code, max 100 chars — [S|V|D]-YYYYMMDD-XXXXXX */
  private async allocateUnitCode(proposed?: string, unitType?: string): Promise<string> {
    const trimmed = proposed?.trim();
    if (trimmed) {
      if (trimmed.length > 100) {
        throw new BadRequestException('Unit code must be at most 100 characters');
      }
      const taken = await this.prisma.unit.findUnique({ where: { code: trimmed } });
      if (taken) {
        throw new BadRequestException(`Unit code "${trimmed}" is already in use`);
      }
      return trimmed;
    }

    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const prefix = this.getCodePrefixFromUnitType(unitType);
    for (let attempt = 0; attempt < 25; attempt++) {
      const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
      const code = `${prefix}-${ymd}-${rand}`;
      const exists = await this.prisma.unit.findUnique({ where: { code } });
      if (!exists) return code;
    }
    throw new BadRequestException('Could not generate a unique unit code; try again');
  }

  async create(dto: CreateUnitDto, userId: number) {
    const code = await this.allocateUnitCode(dto.code, dto.unitType);
    const unit = await this.prisma.unit.create({
      data: {
        code,
        description: dto.description,
        address: dto.address?.trim() || null,
        projectName: dto.projectName ?? null,
        location: dto.location ?? null,
        floor: dto.floor != null ? dto.floor : null,
        price: dto.price != null ? dto.price : null,
        monthlyInstallment: dto.monthlyInstallment != null ? dto.monthlyInstallment : null,
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
        bedrooms: dto.bedrooms ?? null,
        bathrooms: dto.bathrooms ?? null,
        area: dto.area != null ? dto.area : null,
        unitType: dto.unitType ?? null,
        driveMediaLink: dto.driveMediaLink?.trim() || null,
        amenities:
          dto.amenities == null
            ? undefined
            : dto.amenities.length > 0
              ? dto.amenities
              : null,
        externalLinks:
          dto.externalLinks == null
            ? undefined
            : dto.externalLinks.length > 0
              ? dto.externalLinks
              : null,
        status: dto.status ?? 'available',
        createdBy: BigInt(userId),
      } as any,
      include: {
        creator: { select: publisherSelect },
        publishedBy: { select: publisherSelect },
      } as any,
    });

    const marketingUsers = await this.prisma.user.findMany({
      where: { role: { name: { in: ['marketing', 'super_admin'] } } },
      select: { id: true },
    } as any);
    for (const mu of marketingUsers) {
      if (String(mu.id) !== String(userId)) {
        await this.notifications.createAndEmit({
          userId: Number(mu.id),
          type: 'unit_created' as any,
          title: `New unit ${code} needs publishing`,
          message: `A new unit (${code}) has been added and is waiting to be published.`,
          relatedEntityType: 'unit',
          relatedEntityId: Number(unit.id),
        });
      }
    }

    return unit;
  }

  async findAll(
    viewerUserId?: number,
    viewerRole?: string,
    filters?: { q?: string; salesId?: string; teamId?: string },
  ) {
    const role = viewerRole ?? '';
    const whereClauses: Prisma.UnitWhereInput[] = [];

    if (role === 'sales' && viewerUserId != null && Number.isFinite(viewerUserId)) {
      whereClauses.push({
        OR: [{ createdBy: BigInt(viewerUserId) }, { isPublished: true }],
      });
    }

    const q = filters?.q?.trim();
    if (q) {
      whereClauses.push({
        OR: [
          { code: { contains: q } },
          { description: { contains: q } },
          { projectName: { contains: q } },
          { location: { contains: q } },
          { address: { contains: q } },
        ],
      });
    }

    const salesIdNum = Number(filters?.salesId);
    if (Number.isFinite(salesIdNum) && salesIdNum > 0) {
      whereClauses.push({ createdBy: BigInt(salesIdNum) });
    }

    const teamIdNum = Number(filters?.teamId);
    if (Number.isFinite(teamIdNum) && teamIdNum > 0) {
      whereClauses.push({
        creator: {
          is: { teamId: BigInt(teamIdNum) },
        },
      });
    }

    const where = whereClauses.length > 0 ? { AND: whereClauses } : undefined;

    return this.prisma.unit.findMany({
      where,
      include: {
        creator: { select: publisherSelect },
        publishedBy: { select: publisherSelect },
      } as any,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, viewerUserId?: number, viewerRole?: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: BigInt(id) },
      include: {
        creator: true,
        publishedBy: { select: publisherSelect },
      } as any,
    });

    if (!unit) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }

    if (viewerUserId != null && viewerRole != null) {
      this.assertSalesCanViewUnit(unit, viewerRole, viewerUserId);
    }

    return unit;
  }

  async update(id: number, updateUnitDto: UpdateUnitDto, roleName: string, viewerUserId?: number) {
    if (!UNIT_FULL_ACCESS_ROLES.includes(roleName)) {
      throw new ForbiddenException('You cannot edit unit inventory with your role');
    }

    const existing = await this.prisma.unit.findUnique({
      where: { id: BigInt(id) },
      select: { id: true, createdBy: true },
    });
    if (!existing) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }
    if (viewerUserId != null) {
      this.assertSalesCanMutateUnit(existing, roleName, viewerUserId);
    }

    const {
      price,
      area,
      monthlyInstallment,
      deliveryDate,
      driveMediaLink,
      ...rest
    } = updateUnitDto as UpdateUnitDto & Record<string, unknown>;

    const data: Record<string, unknown> = { ...rest };

    if (price !== undefined) {
      data.price = price === null ? null : Number(price);
    }
    if (area !== undefined) {
      data.area = area === null ? null : Number(area);
    }
    if (monthlyInstallment !== undefined) {
      data.monthlyInstallment =
        monthlyInstallment === null ? null : Number(monthlyInstallment);
    }
    if (deliveryDate !== undefined) {
      data.deliveryDate =
        deliveryDate === null || deliveryDate === ''
          ? null
          : new Date(deliveryDate as string);
    }
    if (driveMediaLink !== undefined) {
      data.driveMediaLink =
        driveMediaLink === null || driveMediaLink === ''
          ? null
          : String(driveMediaLink).trim();
    }

    delete data.isPublished;
    delete data.publishedLink;
    delete data.publishedAt;
    delete data.publishedById;

    return this.prisma.unit.update({
      where: { id: BigInt(id) },
      data: data as any,
      include: {
        creator: { select: publisherSelect },
        publishedBy: { select: publisherSelect },
      } as any,
    });
  }

  async publish(id: number, dto: PublishUnitDto, userId: number) {
    const link = this.normalizePublishedLink(dto.publishedLink, dto.isPublished);

    const unit = await this.prisma.unit.findUnique({
      where: { id: BigInt(id) },
      select: { code: true, createdBy: true },
    });
    if (!unit) throw new NotFoundException(`Unit with ID ${id} not found`);

    const result = await this.prisma.unit.update({
      where: { id: BigInt(id) },
      data: {
        isPublished: dto.isPublished,
        publishedLink: dto.isPublished ? link : null,
        publishedAt: dto.isPublished ? new Date() : null,
        publishedById: dto.isPublished ? BigInt(userId) : null,
      } as any,
      include: {
        creator: { select: publisherSelect },
        publishedBy: { select: publisherSelect },
      } as any,
    });

    if (dto.isPublished && unit.createdBy) {
      await this.notifications.createAndEmit({
        userId: Number(unit.createdBy),
        type: 'unit_published' as any,
        title: `Your unit ${unit.code} has been published`,
        message: `Unit ${unit.code} is now live in the inventory.`,
        relatedEntityType: 'unit',
        relatedEntityId: id,
      });
    }

    return result;
  }

  async remove(id: number, roleName: string, viewerUserId?: number) {
    if (!UNIT_FULL_ACCESS_ROLES.includes(roleName)) {
      throw new ForbiddenException('You cannot delete units with your role');
    }
    const existing = await this.prisma.unit.findUnique({
      where: { id: BigInt(id) },
      select: { id: true, createdBy: true },
    });
    if (!existing) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }
    if (viewerUserId != null) {
      this.assertSalesCanMutateUnit(existing, roleName, viewerUserId);
    }
    return this.prisma.unit.delete({
      where: { id: BigInt(id) },
    });
  }
}
