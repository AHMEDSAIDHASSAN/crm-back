import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger, ConflictException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LeadAssignmentExpireAction, LeadStatus } from '@prisma/client';
import { assertCanAccessUser } from '../common/subordinates.helper';
import * as XLSX from 'xlsx';
import fetch from 'node-fetch';
import { PrismaService } from '../config/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { GetLeadsDto } from './dto/get-leads.dto';
import { createPaginatedResponse } from '../common/pagination.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { WhatsAppWebService } from '../whatsapp-web/whatsapp-web.service';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private waService: WhatsAppWebService,
  ) { }

  private sendLeadWhatsApp(phone: string | null | undefined, name: string, type: 'new' | 'assigned', senderUserId?: string) {
    if (!phone?.trim()) return;
    const msg = type === 'new'
      ? `مرحباً ${name}! 👋\nشكراً لاهتمامك. سيتواصل معك أحد مستشارينا قريباً.\n\nفريق SIRA للعقارات 🏠`
      : `مرحباً ${name}! 👋\nيسعدنا خدمتك. سيتواصل معك مستشارنا العقاري قريباً لمساعدتك في إيجاد العقار المناسب.\n\nفريق SIRA للعقارات 🏠`;
    this.waService.sendMessage(senderUserId ?? 'system', phone.trim(), msg)
      .catch((err) => this.logger.warn(`WhatsApp auto-message failed for ${phone}: ${err.message}`));
  }

  /** Digits only — used to detect duplicate phones across imports (campaign & cold call). */
  private normalizePhoneDigits(phone: string): string {
    return String(phone ?? '').replace(/\D/g, '');
  }

  async create(createLeadDto: CreateLeadDto, currentUserId?: number, currentRole?: string) {
    const canManualCreate = currentRole === 'super_admin' || currentRole === 'operation_manager';
    if (!canManualCreate) {
      throw new ForbiddenException('Only super admin and operation manager can add leads manually');
    }

    const payload = { ...createLeadDto };

    // Validate assignment only if assignedTo is provided (and not super_admin create)
    if (payload.assignedTo) {
      await this.validateAssignment(
        currentUserId,
        currentRole,
        payload.assignedTo,
        payload.assignmentMode || 'standard',
      );
    }

    const lead = await this.prisma.lead.create({
      data: {
        ...payload,
        assignedAt: payload.assignedTo ? new Date() : null,
      },
      include: {
        leadSource: true,
        campaign: true,
        assignedUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create initial assignment record only if lead is assigned (not for super_admin unassigned leads)
    if (payload.assignedTo) {
      await this.prisma.leadAssignment.create({
        data: {
          leadId: lead.id,
          assignedTo: payload.assignedTo,
          assignedBy: currentUserId ? BigInt(currentUserId) : null,
          assignmentType: 'initial',
        },
      });

      const leadName = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'New lead';
      this.notificationsService.createAndEmit({
        userId: payload.assignedTo,
        type: 'lead_assigned',
        title: 'New Lead Assigned',
        message: `Lead "${leadName}" has been assigned to you.`,
        relatedEntityType: 'lead',
        relatedEntityId: lead.id,
      }).catch((err) => this.logger.error(`Failed to emit lead assignment notification: ${err.message}`));
    }

    // Auto WhatsApp message on new lead
    const leadName = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'عزيزي العميل';
    this.sendLeadWhatsApp(lead.phone, leadName, 'new');

    return lead;
  }

  async findAll(query: GetLeadsDto, currentUserId?: number, currentRole?: string) {
    const role = String(currentRole ?? '').trim().toLowerCase();
    const {
      page = 1,
      limit = 10,
      search,
      assignmentMode,
      priority,
      type,
      status,
      dateFrom,
      dateTo,
      assignedTo,
      previouslyAssignedTo,
      assigneePresence,
      excludeRotation,
      campaignId,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Search: name (single field or first+last), phone (raw or digits-only), email.
    // No `mode: 'insensitive'` — MySQL does not support it in Prisma (PostgreSQL-only).
    if (search) {
      const q = search.trim();
      const searchOR: Record<string, unknown>[] = [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
      ];

      const digitsOnly = q.replace(/\D/g, '');
      if (digitsOnly.length >= 3) {
        searchOR.push({ phone: { contains: digitsOnly } });
      }

      const parts = q.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        const first = parts[0]!;
        const last = parts[parts.length - 1]!;
        searchOR.push({
          AND: [{ firstName: { contains: first } }, { lastName: { contains: last } }],
        });
        searchOR.push({
          AND: [{ firstName: { contains: last } }, { lastName: { contains: first } }],
        });
      }

      where.OR = searchOR;
    }

    // Assignment Mode filter
    if (assignmentMode) {
      where.assignmentMode = assignmentMode;
    }

    // Priority filter
    if (priority) {
      where.priority = priority;
    }

    // Lead type filter (cold_call / campaign / primary)
    if (type) {
      where.type = type;
    }

    if (campaignId) {
      where.campaignId = BigInt(campaignId);
    }

    if (status) {
      where.status = status;
    }

    // Date range filter (createdAt)
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        where.createdAt.lte = d;
      }
    }

    if (previouslyAssignedTo) {
      if (currentUserId == null || !currentRole) {
        throw new BadRequestException('previouslyAssignedTo filter requires authentication');
      }
      const prevId = Number(previouslyAssignedTo);
      await assertCanAccessUser(this.prisma, currentUserId, currentRole, prevId);
      const prevBig = BigInt(prevId);
      where.AND = [
        {
          OR: [{ assignedTo: null }, { assignedTo: { not: prevBig } }],
        },
        {
          assignments: {
            some: { assignedTo: prevBig },
          },
        },
      ];
    } else if (assignedTo) {
      if (currentUserId == null || !currentRole) {
        throw new BadRequestException('assignedTo filter requires authentication');
      }
      const assigneeId = Number(assignedTo);
      await assertCanAccessUser(this.prisma, currentUserId, currentRole, assigneeId);
      where.assignedTo = BigInt(assigneeId);
    } else if (
      role &&
      role !== 'super_admin' &&
      role !== 'operation_manager' &&
      role !== 'sales_manager' &&
      !(role === 'sales' && status === 'rotation')
    ) {
      const userId = BigInt(currentUserId!);

      const roleFilter: any = {};
      if (role === 'sales') {
        roleFilter.assignedTo = userId;
      } else if (role === 'tech_lead') {
        roleFilter.OR = [
          { assignedTo: userId },
          { team: { teamLeaderId: userId } },
        ];
      } else {
        throw new ForbiddenException('You do not have permission to view leads');
      }

      if (roleFilter.assignedTo) {
        where.assignedTo = roleFilter.assignedTo;
      } else if (roleFilter.OR) {
        if (where.OR) {
          const searchOR = [...where.OR];
          delete where.OR;
          where.AND = [{ OR: searchOR }, { OR: roleFilter.OR }];
        } else {
          where.OR = roleFilter.OR;
        }
      }
    }

    // Optional: only leads with an owner vs pool (no assignee). Ignored when filtering by a specific user id.
    // Use nullable-relation filters (Prisma UserNullableScalarRelationFilter: is / isNot), not BigInt { not: null }.
    if (assigneePresence && (assigneePresence === 'assigned' || assigneePresence === 'unassigned') && !assignedTo) {
      if (role === 'sales' && assigneePresence === 'unassigned') {
        return createPaginatedResponse([], 0, page, limit);
      }

      const cond =
        assigneePresence === 'assigned'
          ? { NOT: { assignedUser: { is: null } } }
          : { assignedUser: null };

      if (typeof where.assignedTo === 'bigint') {
        /* specific assignee filter already set */
      } else if (previouslyAssignedTo && Array.isArray(where.AND)) {
        where.AND.push(cond);
      } else if (where.OR != null && where.assignedTo === undefined) {
        const orPart = where.OR;
        delete where.OR;
        const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND != null ? [where.AND] : [];
        where.AND = [...existingAnd, { OR: orPart }, cond];
      } else if (where.AND) {
        const andArr = Array.isArray(where.AND) ? where.AND : [where.AND];
        where.AND = [...andArr, cond];
      } else {
        Object.assign(where, cond);
      }
    }

    // "All leads" UI hides rotation pool unless user opens Rotation tab (excludeRotation=true, no status).
    if (excludeRotation && status == null) {
      const notRotation = { status: { not: 'rotation' as const } };
      if (Object.keys(where).length === 0) {
        Object.assign(where, notRotation);
      } else if (Array.isArray(where.AND)) {
        where.AND = [...where.AND, notRotation];
      } else if (where.AND != null) {
        where.AND = [where.AND, notRotation];
      } else {
        const snapshot = { ...where };
        for (const k of Object.keys(where)) delete where[k];
        where.AND = [snapshot, notRotation];
      }
    }

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        skip,
        take: limit,
        where,
        include: {
          leadSource: true,
          campaign: true,
          assignedUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
              teamLeaderId: true,
            },
          },
          _count: {
            select: {
              feedbacks: true,
              callLogs: true,
              meetings: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return createPaginatedResponse(leads, total, page, limit);
  }

  async findOne(id: number, currentUserId?: number, currentRole?: string) {
    const role = String(currentRole ?? '').trim().toLowerCase();
    const lead = await this.prisma.lead.findUnique({
      where: { id: BigInt(id) },
      include: {
        leadSource: true,
        campaign: true,
        dataBatch: true,
        assignedUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            roleId: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            teamLeader: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        feedbacks: {
          orderBy: { createdAt: 'desc' },
          take: 40,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        callLogs: {
          orderBy: { createdAt: 'desc' },
          take: 40,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        meetings: {
          orderBy: { meetingDate: 'desc' },
          take: 40,
          include: {
            scheduler: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        assignments: {
          orderBy: { assignedAt: 'desc' },
          take: 40,
          include: {
            assignedUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            assigner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    // Authorization check for single lead view
    if (role && role !== 'super_admin' && role !== 'operation_manager' && role !== 'sales_manager') {
      const userId = BigInt(currentUserId!);
      const isAssignedToUser = lead.assignedTo === userId;
      const isTeamLeaderForLead = lead.team?.teamLeader?.id === userId;
      const isRotation = lead.status === 'rotation';

      // Exception: any sales can view rotation pool leads
      if (isRotation) {
        // allowed
      } else if (role === 'sales' && !isAssignedToUser) {
        throw new ForbiddenException('You do not have permission to view this lead');
      } else if (role === 'tech_lead' && !isAssignedToUser && !isTeamLeaderForLead) {
        throw new ForbiddenException('You do not have permission to view this lead');
      } else if (role !== 'sales' && role !== 'tech_lead') {
        throw new ForbiddenException('You do not have permission to view this lead');
      }
    }

    return lead;
  }

  private async validateAssignment(
    assignerId: number | undefined,
    assignerRole: string | undefined,
    assigneeId: number | BigInt,
    mode: string,
  ) {
    if (!assignerRole) return;

    const assignee = await this.prisma.user.findUnique({
      where: { id: BigInt(assigneeId.toString()) },
      include: { role: true },
    });

    if (!assignee) {
      throw new NotFoundException(`Assignee with ID ${assigneeId} not found`);
    }

    const assigneeRole = assignee.role.name;

    // Standard flow: Super Admin -> Operation Manager -> Sales
    if (mode === 'standard') {
      if (assignerRole === 'super_admin' && assigneeRole !== 'operation_manager') {
        throw new BadRequestException('Super Admin can only assign to Operation Manager');
      }
      if (assignerRole === 'operation_manager' && assigneeRole !== 'sales') {
        throw new BadRequestException('Operation Manager can only assign to Sales');
      }
      if (assignerRole === 'sales_manager' || assignerRole === 'tech_lead' || assignerRole === 'sales') {
        throw new BadRequestException(
          'Standard flow is only: Super Admin -> Operation Manager -> Sales',
        );
      }
    } else if (mode === 'customize') {
      if ((assignerRole === 'super_admin' || assignerRole === 'operation_manager') && assigneeRole !== 'sales') {
        throw new BadRequestException('In customize mode you can only assign directly to Sales');
      }
      if (assignerRole !== 'operation_manager' && assignerRole !== 'super_admin') {
        throw new BadRequestException('Only Super Admin or Operation Manager can use customize (assign to Sales direct)');
      }
    } else {
      throw new BadRequestException(`Unknown assignment mode: ${mode}`);
    }
  }

  private async resolveTemporaryAssignmentPayload(
    currentUserId: number | undefined,
    currentRole: string | undefined,
    primaryAssigneeId: number,
    opts: {
      assignmentDurationHours?: number;
      assignmentExpireAction?: LeadAssignmentExpireAction;
      backupAssignUserId?: number;
    },
  ): Promise<{
    assignmentExpiresAt: Date | null;
    assignmentExpireAction: LeadAssignmentExpireAction | null;
    assignmentBackupUserId: bigint | null;
  }> {
    const hoursRaw = opts.assignmentDurationHours;
    if (hoursRaw === undefined || hoursRaw === null || Number(hoursRaw) <= 0) {
      return {
        assignmentExpiresAt: null,
        assignmentExpireAction: null,
        assignmentBackupUserId: null,
      };
    }

    const hours = Number(hoursRaw);
    if (!opts.assignmentExpireAction) {
      throw new BadRequestException(
        'assignmentExpireAction is required when assignmentDurationHours is greater than 0',
      );
    }

    if (opts.assignmentExpireAction === LeadAssignmentExpireAction.backup_sales) {
      if (opts.backupAssignUserId == null) {
        throw new BadRequestException(
          'backupAssignUserId is required when assignmentExpireAction is backup_sales',
        );
      }
      if (Number(opts.backupAssignUserId) === Number(primaryAssigneeId)) {
        throw new BadRequestException('Backup assignee must be different from the primary assignee');
      }
      const backup = await this.prisma.user.findUnique({
        where: { id: BigInt(opts.backupAssignUserId) },
        include: { role: true },
      });
      if (!backup) {
        throw new NotFoundException(`Backup assignee with ID ${opts.backupAssignUserId} not found`);
      }
      if (backup.role.name !== 'sales') {
        throw new BadRequestException('Backup assignee must be a Sales user');
      }
      if (backup.status !== 'active') {
        throw new BadRequestException('Backup assignee must be active');
      }
      if (currentUserId != null && currentRole) {
        await assertCanAccessUser(this.prisma, currentUserId, currentRole, opts.backupAssignUserId);
      }
      const assignmentExpiresAt = new Date();
      assignmentExpiresAt.setTime(assignmentExpiresAt.getTime() + hours * 3600 * 1000);
      return {
        assignmentExpiresAt,
        assignmentExpireAction: opts.assignmentExpireAction,
        assignmentBackupUserId: BigInt(opts.backupAssignUserId),
      };
    }

    const assignmentExpiresAt = new Date();
    assignmentExpiresAt.setTime(assignmentExpiresAt.getTime() + hours * 3600 * 1000);
    return {
      assignmentExpiresAt,
      assignmentExpireAction: opts.assignmentExpireAction,
      assignmentBackupUserId: null,
    };
  }

  async update(id: number, updateLeadDto: UpdateLeadDto, currentUserId?: number, currentRole?: string) {
    await this.findOne(id, currentUserId, currentRole);

    const {
      assignedTo,
      assignmentDurationHours,
      assignmentExpireAction,
      backupAssignUserId,
      ...rest
    } = updateLeadDto as any;

    const existingLead = await this.prisma.lead.findUnique({
      where: { id: BigInt(id) },
      select: { assignedTo: true, assignmentMode: true, assignedUser: { select: { firstName: true, phone: true } } },
    });

    const isNewAssignment =
      updateLeadDto.assignedTo &&
      existingLead!.assignedTo?.toString() !== updateLeadDto.assignedTo.toString();

    if (isNewAssignment) {
      await this.validateAssignment(
        currentUserId,
        currentRole,
        updateLeadDto.assignedTo,
        updateLeadDto.assignmentMode || (existingLead!.assignmentMode as string) || 'standard',
      );
    }

    const updateData: any = { ...rest };
    if (assignedTo != null) updateData.assignedTo = BigInt(Number(assignedTo));
    if (isNewAssignment) updateData.assignedAt = new Date();
    Object.keys(updateData).forEach((k) => updateData[k] === undefined && delete updateData[k]);

    if (isNewAssignment || assignmentDurationHours !== undefined) {
      const primaryId = isNewAssignment
        ? Number(updateLeadDto.assignedTo)
        : existingLead!.assignedTo != null
          ? Number(existingLead!.assignedTo)
          : null;

      if (
        primaryId == null &&
        assignmentDurationHours != null &&
        Number(assignmentDurationHours) > 0
      ) {
        throw new BadRequestException('Cannot set a temporary assignment on an unassigned lead');
      }

      if (primaryId != null || (assignmentDurationHours !== undefined && Number(assignmentDurationHours) <= 0)) {
        const temp = await this.resolveTemporaryAssignmentPayload(
          currentUserId,
          currentRole,
          primaryId ?? 0,
          {
            assignmentDurationHours,
            assignmentExpireAction,
            backupAssignUserId,
          },
        );
        Object.assign(updateData, temp);
      }
    }

    const lead = await this.prisma.lead.update({
      where: { id: BigInt(id) },
      data: updateData,
      include: {
        leadSource: true,
        campaign: true,
        assignedUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create assignment record if it's a new assignment
    if (isNewAssignment) {
      await this.prisma.leadAssignment.create({
        data: {
          leadId: BigInt(id),
          assignedTo: BigInt(updateLeadDto.assignedTo),
          assignedBy: currentUserId ? BigInt(currentUserId) : null,
          assignmentType: 'manual',
        },
      });

      const leadName = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'عميل';
      this.notificationsService.createAndEmit({
        userId: updateLeadDto.assignedTo,
        type: 'lead_assigned',
        title: 'تم تعيين ليد جديد لك',
        message: `تم تعيين العميل "${leadName}" لك.`,
        relatedEntityType: 'lead',
        relatedEntityId: lead.id,
      }).catch((err) => this.logger.error(`Failed to emit lead assignment notification: ${err.message}`));

      // WhatsApp to the new sales rep
      this.prisma.user.findUnique({
        where: { id: BigInt(updateLeadDto.assignedTo) },
        select: { firstName: true, phone: true },
      }).then((newAssignee) => {
        if (newAssignee?.phone) {
          const msg = `مرحباً ${newAssignee.firstName}،\nتم تعيين ليد جديد لك في نظام SIRA.\nاسم العميل: ${leadName}\nافتح التطبيق الآن لمتابعة الليد.`;
          this.waService.sendMessage('system', newAssignee.phone, msg).catch(() => undefined);
        }
      }).catch(() => undefined);

      // Send WhatsApp message to the lead (client)
      this.sendLeadWhatsApp(lead.phone, leadName, 'assigned');

      // Notify previous sales rep that lead was transferred away from them
      if (existingLead?.assignedTo != null && existingLead.assignedUser) {
        this.waService.notifySalesRepTransferred(
          existingLead.assignedUser.phone,
          existingLead.assignedUser.firstName ?? '',
          1,
        ).catch(() => undefined);
      }
    }

    return lead;
  }

  async bulkUpdate(bulkAssignLeadsDto: any, currentUserId?: number, currentRole?: string) {
    const {
      leadIds,
      assignedTo,
      assignmentMode,
      assignmentDurationHours,
      assignmentExpireAction,
      backupAssignUserId,
    } = bulkAssignLeadsDto;

    await this.validateAssignment(
      currentUserId,
      currentRole,
      assignedTo,
      assignmentMode || 'standard',
    );

    const temp = await this.resolveTemporaryAssignmentPayload(
      currentUserId,
      currentRole,
      Number(assignedTo),
      { assignmentDurationHours, assignmentExpireAction, backupAssignUserId },
    );

    const updateData = {
      assignedTo: BigInt(assignedTo),
      assignmentMode: assignmentMode || 'standard',
      assignedAt: new Date(),
      ...temp,
    };

    const updatedLeads = await this.prisma.$transaction(async (tx) => {
      const results = await Promise.all(
        leadIds.map(async (id: number) => {
          const updatedLead = await tx.lead.update({
            where: { id: BigInt(id) },
            data: updateData,
            select: { id: true, firstName: true, lastName: true },
          });

          await tx.leadAssignment.create({
            data: {
              leadId: BigInt(id),
              assignedTo: BigInt(assignedTo),
              assignedBy: currentUserId ? BigInt(currentUserId) : null,
              assignmentType: 'manual',
            },
          });

          return updatedLead;
        }),
      );

      return results;
    });

    const leadNames = updatedLeads
      .map((l: any) => [l.firstName, l.lastName].filter(Boolean).join(' ').trim())
      .filter(Boolean);
    const n = leadIds.length;
    let message: string;
    if (leadNames.length === 0) {
      message = n === 1 ? 'A new lead has been assigned to you.' : `${n} leads have been assigned to you.`;
    } else if (leadNames.length === 1) {
      message = `Lead "${leadNames[0]}" has been assigned to you.`;
    } else if (leadNames.length === 2) {
      message = `Leads "${leadNames[0]}" and "${leadNames[1]}" have been assigned to you.`;
    } else {
      message = `${n} leads have been assigned to you.`;
    }

    const arabicMsg = n === 1
      ? `تم تعيين ليد جديد لك في نظام SIRA.`
      : `تم تعيين ${n} ليدز جديدة لك في نظام SIRA.`;

    this.notificationsService.createAndEmit({
      userId: assignedTo,
      type: 'lead_assigned',
      title: n === 1 ? 'تم تعيين ليد جديد لك' : `تم تعيين ${n} ليدز لك`,
      message: arabicMsg,
      relatedEntityType: 'lead',
    }).catch((err) => this.logger.error(`Failed to emit bulk assignment notification: ${err.message}`));

    // WhatsApp to the new sales rep
    this.prisma.user.findUnique({
      where: { id: BigInt(assignedTo) },
      select: { firstName: true, phone: true },
    }).then((assignee) => {
      if (assignee?.phone) {
        this.waService.sendMessage('system', assignee.phone, `مرحباً ${assignee.firstName}،\n${arabicMsg}\nافتح التطبيق الآن.`)
          .catch(() => undefined);
      }
    }).catch(() => undefined);

    // Auto WhatsApp message for each assigned lead
    const fullLeads = await this.prisma.lead.findMany({
      where: { id: { in: leadIds.map((id: number) => BigInt(id)) } },
      select: { phone: true, firstName: true, lastName: true },
    });
    fullLeads.forEach((l: any) => {
      const name = [l.firstName, l.lastName].filter(Boolean).join(' ') || 'عزيزي العميل';
      this.sendLeadWhatsApp(l.phone, name, 'assigned');
    });

    return updatedLeads;
  }

  /** Unassign leads and set status to rotation (pool for reassignment). */
  async bulkSendToRotation(
    leadIds: number[],
    currentRole?: string,
    opts?: { force?: boolean },
  ) {
    const allowed = ['super_admin', 'operation_manager', 'sales_manager', 'tech_lead'];
    if (!currentRole || !allowed.includes(currentRole)) {
      throw new ForbiddenException('You are not allowed to move leads to the rotation pool');
    }
    if (!leadIds?.length) {
      throw new BadRequestException('leadIds is required');
    }

    const ids = [...new Set(leadIds.map((id) => BigInt(id)))];
    const leads = await this.prisma.lead.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        assignedUser: { select: { id: true, firstName: true, lastName: true, phone: true } },
        _count: { select: { meetings: true, feedbacks: true } },
      },
    });
    const found = new Set(leads.map((l) => l.id.toString()));
    const missing = ids.filter((id) => !found.has(id.toString())).map((id) => id.toString());
    if (missing.length) {
      throw new BadRequestException(`Unknown lead id(s): ${missing.join(', ')}`);
    }
    const blockedLeads = leads.filter((l) => l._count.meetings > 0 || l._count.feedbacks > 0);
    if (blockedLeads.length && opts?.force !== true) {
      throw new ConflictException({
        message:
          'Some leads have engagement history (meetings/feedback). Confirm if you still want to send them to rotation.',
        code: 'ROTATION_CONFIRM_REQUIRED',
        blockedLeads: blockedLeads.map((l) => ({
          id: l.id.toString(),
          name: [l.firstName, l.lastName].filter(Boolean).join(' ').trim() || `Lead ${l.id.toString()}`,
          assignedSales:
            l.assignedUser != null
              ? {
                  id: l.assignedUser.id.toString(),
                  name:
                    [l.assignedUser.firstName, l.assignedUser.lastName]
                      .filter(Boolean)
                      .join(' ')
                      .trim() || `User ${l.assignedUser.id.toString()}`,
                }
              : null,
          meetingsCount: l._count.meetings,
          feedbacksCount: l._count.feedbacks,
        })),
      });
    }

    const updated = await this.prisma.$transaction(
      leadIds.map((id) =>
        this.prisma.lead.update({
          where: { id: BigInt(id) },
          data: {
            assignedTo: null,
            assignedAt: null,
            status: 'rotation',
            assignmentExpiresAt: null,
            assignmentExpireAction: null,
            assignmentBackupUserId: null,
          },
        }),
      ),
    );

    // Notify each sales rep whose leads were retracted
    const retractedByUser = new Map<string, { firstName: string; phone: string | null; count: number }>();
    for (const lead of leads) {
      if (lead.assignedUser?.id != null) {
        const uid = lead.assignedUser.id.toString();
        const entry = retractedByUser.get(uid);
        if (entry) {
          entry.count++;
        } else {
          retractedByUser.set(uid, {
            firstName: lead.assignedUser.firstName ?? '',
            phone: (lead.assignedUser as any).phone ?? null,
            count: 1,
          });
        }
      }
    }
    for (const info of retractedByUser.values()) {
      this.waService.notifySalesRepRetracted(info.phone, info.firstName, info.count).catch(() => undefined);
    }

    return {
      updatedCount: updated.length,
      forced: opts?.force === true,
      blockedCount: blockedLeads.length,
    };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processExpiredTemporaryAssignments() {
    const now = new Date();
    const expired = await this.prisma.lead.findMany({
      where: {
        assignmentExpiresAt: { lte: now },
        assignmentExpireAction: { not: null },
        /** Only leads that still have an owner; avoids re-processing inconsistent rows */
        assignedTo: { not: null },
      },
      select: {
        id: true,
        assignmentExpireAction: true,
        assignmentBackupUserId: true,
      },
    });

    for (const lead of expired) {
      try {
        await this.prisma.$transaction(async (tx) => {
          if (lead.assignmentExpireAction === LeadAssignmentExpireAction.rotation) {
            const meetingCount = await tx.meeting.count({ where: { leadId: lead.id } });
            if (meetingCount > 0) {
              await tx.lead.update({
                where: { id: lead.id },
                data: {
                  assignmentExpiresAt: null,
                  assignmentExpireAction: null,
                  assignmentBackupUserId: null,
                },
              });
              this.logger.log(
                `Skipped auto-rotation for lead ${lead.id}: ${meetingCount} meeting(s) exist (engagement). Cleared expiry; assignee kept.`,
              );
              return;
            }
            await tx.lead.update({
              where: { id: lead.id },
              data: {
                assignedTo: null,
                assignedAt: null,
                status: 'rotation',
                assignmentExpiresAt: null,
                assignmentExpireAction: null,
                assignmentBackupUserId: null,
              },
            });
            return;
          }

          if (
            lead.assignmentExpireAction === LeadAssignmentExpireAction.backup_sales &&
            lead.assignmentBackupUserId
          ) {
            const backupId = lead.assignmentBackupUserId;
            await tx.lead.update({
              where: { id: lead.id },
              data: {
                assignedTo: backupId,
                assignedAt: new Date(),
                assignmentExpiresAt: null,
                assignmentExpireAction: null,
                assignmentBackupUserId: null,
              },
            });
            await tx.leadAssignment.create({
              data: {
                leadId: lead.id,
                assignedTo: backupId,
                assignedBy: null,
                assignmentType: 'manual',
                reason: 'Time-limited assignment expired; reassigned to backup sales',
              },
            });
            return;
          }

          await tx.lead.update({
            where: { id: lead.id },
            data: {
              assignmentExpiresAt: null,
              assignmentExpireAction: null,
              assignmentBackupUserId: null,
            },
          });
        });
      } catch (e: any) {
        this.logger.error(
          `processExpiredTemporaryAssignments failed for lead ${lead.id}: ${e?.message ?? e}`,
        );
      }
    }

    /** Clear expiry metadata on unassigned leads (e.g. manual unassign left flags behind). */
    await this.prisma.lead.updateMany({
      where: {
        assignmentExpiresAt: { lte: now },
        assignmentExpireAction: { not: null },
        assignedTo: null,
      },
      data: {
        assignmentExpiresAt: null,
        assignmentExpireAction: null,
        assignmentBackupUserId: null,
      },
    });
  }

  async remove(id: number, currentUserId?: number, currentRole?: string) {
    const isManager = currentRole === 'super_admin' || currentRole === 'operation_manager';
    if (!isManager) {
      throw new ForbiddenException('Only managers can delete leads');
    }
    await this.findOne(id, currentUserId, currentRole);
    return this.prisma.lead.delete({
      where: { id: BigInt(id) },
    });
  }

  async batchImport(batchId: number, file: any, mapping?: string) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      // 1. Verify batch exists
      const batch = await this.prisma.dataBatch.findUnique({
        where: { id: BigInt(batchId) },
      });

      if (!batch) {
        throw new NotFoundException(`Data batch with ID ${batchId} not found`);
      }

      const batchRow = batch as { campaignId?: bigint | null };
      const isCampaignImport = batchRow.campaignId != null;
      const campaignIdForLead = isCampaignImport ? batchRow.campaignId : null;

      // Parse mapping if provided
      let manualMapping: Record<string, string> = {};
      if (mapping) {
        try {
          manualMapping = JSON.parse(mapping);
        } catch (e) {
          this.logger.error(`Failed to parse manual mapping: ${mapping}`);
        }
      }

      // 2. Parse file using XLSX
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (data.length === 0) {
        throw new BadRequestException('File is empty');
      }

      const existingRows = await this.prisma.lead.findMany({ select: { phone: true } });
      const existingNormalized = new Set(
        existingRows
          .map((r) => this.normalizePhoneDigits(r.phone))
          .filter((d) => d.length >= 5),
      );
      const seenInFile = new Set<string>();

      let imported = 0;
      let skippedDuplicate = 0;
      let failed = 0;

      for (const row of data) {
        try {
          const getValue = (schemaField: string, ...fallbackKeys: string[]) => {
            if (manualMapping[schemaField] && row[manualMapping[schemaField]] !== undefined) {
              return row[manualMapping[schemaField]];
            }
            const keysLower = fallbackKeys.length > 0 ? fallbackKeys.map(k => k.toLowerCase()) : [schemaField.toLowerCase()];
            const foundKey = Object.keys(row).find(rk => {
              const cleanedRk = rk.toLowerCase().replace(/[^a-z0-9]/g, '');
              return keysLower.some(kl => cleanedRk.includes(kl));
            });
            return foundKey ? row[foundKey] : null;
          };

          const phone = String(getValue('phone', 'phone', 'mobile', 'tel', 'whatsapp', 'primary') || '').trim();
          if (!phone) {
            failed++;
            continue;
          }

          const digits = this.normalizePhoneDigits(phone);
          if (digits.length < 5) {
            failed++;
            continue;
          }

          if (seenInFile.has(digits)) {
            skippedDuplicate++;
            continue;
          }

          if (existingNormalized.has(digits)) {
            skippedDuplicate++;
            continue;
          }

          const fullName = String(getValue('name', 'fullname', 'name', 'full', 'first', 'label') || '').trim();
          const email = String(getValue('email', 'email', 'mail') || '').trim() || null;
          const notes = String(getValue('notes', 'note', 'address', 'comment', 'description') || '').trim() || null;
          const rawPriority = String(getValue('priority', 'priority', 'importance') || '').toLowerCase();

          let priority: any = 'medium';
          if (rawPriority.includes('high') || rawPriority.includes('urgent')) priority = 'high';
          if (rawPriority.includes('low')) priority = 'low';

          let firstName = fullName;
          let lastName = '';
          if (fullName.includes(' ')) {
            const parts = fullName.split(' ');
            firstName = parts[0];
            lastName = parts.slice(1).join(' ');
          }

          const createData = {
            firstName: firstName || null,
            lastName: lastName || null,
            phone,
            email,
            notes,
            priority,
            dataBatchId: BigInt(batchId),
            type: (isCampaignImport ? 'campaign' : 'cold_call') as any,
            ...(campaignIdForLead && { campaignId: campaignIdForLead }),
            status: 'new' as any,
          };

          await this.prisma.lead.create({ data: createData });
          imported++;
          seenInFile.add(digits);
          existingNormalized.add(digits);
          this.logger.log(`Imported lead: ${phone}`);
        } catch (error: any) {
          this.logger.error(`Failed to import row: ${JSON.stringify(row)}. Error: ${error?.message ?? error}`);
          failed++;
        }
      }

      try {
        await this.prisma.dataBatch.update({
          where: { id: BigInt(batchId) },
          data: {
            importedCount: imported,
            skippedDuplicateCount: skippedDuplicate,
            failedImportCount: failed,
          },
        });
      } catch (e: any) {
        this.logger.warn(
          `Could not save import stats on data batch ${batchId} (run migration 20260412170000_data_batch_import_counts?): ${e?.message ?? e}`,
        );
      }

      return {
        message: 'Batch import completed',
        total: data.length,
        imported,
        skipped: skippedDuplicate,
        failed,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to parse file: ${error.message}`);
    }
  }

  // ── PHONE INFO ─────────────────────────────────────────────────────────────

  async getPhoneInfo(raw: string, _actorId: string, _role: string) {
    const cleaned = (raw || '').replace(/[^\d+]/g, '');

    // Normalize to E.164 Egyptian format
    let e164 = cleaned;
    if (e164.startsWith('00')) e164 = '+' + e164.slice(2);
    if (!e164.startsWith('+')) {
      if (e164.startsWith('20')) e164 = '+' + e164;
      else if (e164.startsWith('0')) e164 = '+2' + e164;
      else if (e164.length === 10 && e164.startsWith('1')) e164 = '+20' + e164;
      else e164 = '+' + e164;
    }

    const isEgyptian = e164.startsWith('+20');
    const localNumber = isEgyptian ? '0' + e164.slice(3) : e164;
    const prefix = isEgyptian ? localNumber.slice(0, 4) : null;

    // Egyptian carrier detection
    const CARRIERS: Record<string, { name: string; nameAr: string; color: string }> = {
      '0100': { name: 'Vodafone Egypt', nameAr: 'فودافون مصر', color: '#E60000' },
      '0101': { name: 'Vodafone Egypt', nameAr: 'فودافون مصر', color: '#E60000' },
      '0102': { name: 'Vodafone Egypt', nameAr: 'فودافون مصر', color: '#E60000' },
      '0103': { name: 'Vodafone Egypt', nameAr: 'فودافون مصر', color: '#E60000' },
      '0106': { name: 'Vodafone Egypt', nameAr: 'فودافون مصر', color: '#E60000' },
      '0109': { name: 'Vodafone Egypt', nameAr: 'فودافون مصر', color: '#E60000' },
      '0110': { name: 'Etisalat (e&) Egypt', nameAr: 'اتصالات (e&) مصر', color: '#006B2B' },
      '0111': { name: 'Etisalat (e&) Egypt', nameAr: 'اتصالات (e&) مصر', color: '#006B2B' },
      '0112': { name: 'Etisalat (e&) Egypt', nameAr: 'اتصالات (e&) مصر', color: '#006B2B' },
      '0114': { name: 'Etisalat (e&) Egypt', nameAr: 'اتصالات (e&) مصر', color: '#006B2B' },
      '0115': { name: 'WE (Telecom Egypt)', nameAr: 'WE مصر للاتصالات', color: '#7B2FBE' },
      '0116': { name: 'WE (Telecom Egypt)', nameAr: 'WE مصر للاتصالات', color: '#7B2FBE' },
      '0120': { name: 'Orange Egypt', nameAr: 'أورنج مصر', color: '#FF7900' },
      '0121': { name: 'Orange Egypt', nameAr: 'أورنج مصر', color: '#FF7900' },
      '0122': { name: 'Orange Egypt', nameAr: 'أورنج مصر', color: '#FF7900' },
      '0123': { name: 'Orange Egypt', nameAr: 'أورنج مصر', color: '#FF7900' },
      '0127': { name: 'Orange Egypt', nameAr: 'أورنج مصر', color: '#FF7900' },
      '0128': { name: 'Orange Egypt', nameAr: 'أورنج مصر', color: '#FF7900' },
    };

    const carrier = prefix ? (CARRIERS[prefix] ?? null) : null;

    // Check if this number appears in any leads in the system
    const searchVariants = [e164, localNumber, cleaned].filter(Boolean);
    const existingLeads = await this.prisma.lead.findMany({
      where: { phone: { in: searchVariants } },
      select: {
        id: true, firstName: true, lastName: true, status: true,
        assignedUser: { select: { firstName: true, lastName: true } },
        createdAt: true,
      },
      take: 10,
    });

    // Basic validation
    const mobileRegex = /^\+201[0-9]{9}$/;
    const isValidEgyptianMobile = mobileRegex.test(e164);
    const digitCount = e164.replace(/\D/g, '').length;

    return {
      raw,
      e164,
      local: localNumber,
      country: isEgyptian ? 'Egypt' : 'Unknown',
      countryAr: isEgyptian ? 'مصر' : 'غير معروف',
      valid: isValidEgyptianMobile || digitCount >= 10,
      lineType: isEgyptian ? 'mobile' : 'unknown',
      carrier: carrier
        ? { name: carrier.name, nameAr: carrier.nameAr, color: carrier.color }
        : null,
      prefix: prefix ?? null,
      existingLeads: existingLeads.map(l => ({
        id: l.id,
        name: `${l.firstName} ${l.lastName}`.trim(),
        status: l.status,
        assignedTo: l.assignedUser
          ? `${l.assignedUser.firstName} ${l.assignedUser.lastName}`
          : null,
        createdAt: l.createdAt,
      })),
      existingCount: existingLeads.length,
    };
  }

  // ── CALLER ID — multi-provider lookup ────────────────────────────────────

  private normalizeToE164(raw: string): string {
    const cleaned = (raw || '').replace(/[^\d+]/g, '');
    let e164 = cleaned;
    if (!e164.startsWith('+')) {
      if (e164.startsWith('20')) e164 = '+' + e164;
      else if (e164.startsWith('0')) e164 = '+2' + e164;
      else if (e164.length === 10 && e164.startsWith('1')) e164 = '+20' + e164;
      else e164 = '+' + e164;
    }
    return e164;
  }

  async getCallerIdInfo(raw: string) {
    const e164 = this.normalizeToE164(raw);

    const providers: { name: string; callerName: string | null; names: string[]; error?: string }[] = [];

    // ── 1. Numlookup API ──────────────────────────────────────────────────
    const numlookupKey = process.env.NUMLOOKUP_API_KEY;
    if (numlookupKey) {
      try {
        const res = await fetch(
          `https://api.numlookupapi.com/v1/info/${encodeURIComponent(e164)}?apikey=${numlookupKey}`,
          { signal: AbortSignal.timeout(7000) }
        );
        if (res.ok) {
          const data: any = await res.json();
          const callerName: string | null = data?.caller_name ?? data?.name ?? null;
          providers.push({
            name: 'Numlookup',
            callerName,
            names: callerName ? [callerName] : [],
          });
        }
      } catch (err) {
        providers.push({ name: 'Numlookup', callerName: null, names: [], error: 'timeout' });
      }
    }

    // ── 2. Twilio Lookup API ──────────────────────────────────────────────
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    if (twilioSid && twilioToken) {
      try {
        const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(e164)}?Fields=caller_name,line_type_intelligence`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')}`,
          },
          signal: AbortSignal.timeout(7000),
        });
        if (res.ok) {
          const data: any = await res.json();
          const callerName: string | null = data?.caller_name?.caller_name ?? null;
          const carrier: string | null = data?.line_type_intelligence?.carrier_name ?? null;
          providers.push({
            name: 'Twilio',
            callerName,
            names: [callerName, carrier].filter(Boolean) as string[],
          });
        }
      } catch {
        providers.push({ name: 'Twilio', callerName: null, names: [], error: 'timeout' });
      }
    }

    // ── 3. GetContact Business API ────────────────────────────────────────
    const gcApiKey = process.env.GETCONTACT_API_KEY;
    const gcApiUrl = process.env.GETCONTACT_API_URL; // e.g. https://api.getcontact.com/v1
    if (gcApiKey && gcApiUrl) {
      try {
        const res = await fetch(`${gcApiUrl}/phone-lookup`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${gcApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phone: e164 }),
          signal: AbortSignal.timeout(7000),
        });
        if (res.ok) {
          const data: any = await res.json();
          const names: string[] = data?.names ?? data?.tags ?? [];
          providers.push({
            name: 'GetContact',
            callerName: names[0] ?? null,
            names,
          });
        }
      } catch {
        providers.push({ name: 'GetContact', callerName: null, names: [], error: 'timeout' });
      }
    }

    // ── 4. Truecaller Business API ────────────────────────────────────────
    const tcApiKey = process.env.TRUECALLER_API_KEY;
    const tcApiUrl = process.env.TRUECALLER_API_URL;
    if (tcApiKey && tcApiUrl) {
      try {
        const res = await fetch(`${tcApiUrl}/lookup?phone=${encodeURIComponent(e164)}`, {
          headers: { 'Authorization': `Bearer ${tcApiKey}` },
          signal: AbortSignal.timeout(7000),
        });
        if (res.ok) {
          const data: any = await res.json();
          const callerName: string | null = data?.name ?? data?.data?.name ?? null;
          providers.push({
            name: 'Truecaller',
            callerName,
            names: callerName ? [callerName] : [],
          });
        }
      } catch {
        providers.push({ name: 'Truecaller', callerName: null, names: [], error: 'timeout' });
      }
    }

    // ── Aggregate results ─────────────────────────────────────────────────
    const allNames = [...new Set(providers.flatMap(p => p.names).filter(Boolean))];
    const topName = providers.find(p => p.callerName)?.callerName ?? null;
    const hasAnyKey = !!(numlookupKey || (twilioSid && twilioToken) || gcApiKey || tcApiKey);

    return {
      phone: e164,
      topName,
      allNames: allNames.slice(0, 10),
      providers: providers.map(p => ({ name: p.name, callerName: p.callerName, count: p.names.length, error: p.error })),
      configured: hasAnyKey,
      fetched: new Date().toISOString(),
    };
  }
}
