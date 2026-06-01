import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { UnitPreviewsService } from './unit-previews.service';
import { CreatePreviewDto } from './dto/create-preview.dto';
import { CheckInDto, CheckOutDto } from './dto/check-in.dto';

const ALL_ROLES: [string, ...string[]] = [
  'super_admin',
  'operation_manager',
  'sales_manager',
  'tech_lead',
  'sales',
];

@ApiTags('Unit Previews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('unit-previews')
export class UnitPreviewsController {
  constructor(private readonly svc: UnitPreviewsService) {}

  @Post()
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Request a preview — own unit = scheduled, other = pending' })
  create(
    @Body() dto: CreatePreviewDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.svc.create(dto, Number(req.user.userId));
  }

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'List previews (filters: unitId, status, requestedById)' })
  findAll(
    @Query('unitId') unitId?: string,
    @Query('status') status?: string,
    @Query('requestedById') requestedById?: string,
    @Query('q') q?: string,
    @Query('salesId') salesId?: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.svc.findAll({
      unitId: unitId ? +unitId : undefined,
      status: status || undefined,
      requestedById: requestedById ? +requestedById : undefined,
      q: q?.trim() || undefined,
      salesId: salesId ? +salesId : undefined,
      teamId: teamId ? +teamId : undefined,
    });
  }

  @Get('my-units')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Previews on units I own (for approval)' })
  findForMyUnits(
    @Request() req: { user: { userId: string } },
    @Query('q') q?: string,
    @Query('salesId') salesId?: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.svc.findForUnitOwner(Number(req.user.userId), {
      q: q?.trim() || undefined,
      salesId: salesId ? +salesId : undefined,
      teamId: teamId ? +teamId : undefined,
    });
  }

  @Get('availability')
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Check if a unit is free for a preview window (overlapping pending/scheduled/checked-in)',
  })
  checkAvailability(
    @Query('unitId') unitId: string,
    @Query('scheduledAt') scheduledAt: string,
    @Query('durationMin') durationMin?: string,
    @Query('excludePreviewId') excludePreviewId?: string,
  ) {
    if (!unitId?.trim() || !scheduledAt?.trim()) {
      throw new BadRequestException('unitId and scheduledAt are required');
    }
    const uid = Number(unitId);
    if (!Number.isFinite(uid) || uid < 1) {
      throw new BadRequestException('Invalid unitId');
    }
    return this.svc.checkAvailability(
      uid,
      scheduledAt,
      durationMin != null && durationMin !== '' ? +durationMin : 60,
      excludePreviewId != null && excludePreviewId !== '' ? +excludePreviewId : undefined,
    );
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Get a single preview (requester, unit owner, or lead roles)' })
  findOne(
    @Param('id') id: string,
    @Request() req: { user: { userId: string; role?: string } },
  ) {
    return this.svc.findOneForViewer(+id, Number(req.user.userId), req.user.role);
  }

  @Patch(':id/approve')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Approve a pending preview (unit owner only)' })
  approve(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.svc.approve(+id, Number(req.user.userId));
  }

  @Patch(':id/reject')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Reject a pending preview (unit owner only)' })
  reject(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.svc.reject(+id, Number(req.user.userId));
  }

  @Patch(':id/check-in')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Check in with GPS location' })
  checkIn(
    @Param('id') id: string,
    @Body() dto: CheckInDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.svc.checkIn(+id, Number(req.user.userId), dto.lat, dto.lng);
  }

  @Patch(':id/check-out')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Check out with GPS location' })
  checkOut(
    @Param('id') id: string,
    @Body() dto: CheckOutDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.svc.checkOut(+id, Number(req.user.userId), dto.lat, dto.lng);
  }

  @Patch(':id/cancel')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Cancel a preview (requester only)' })
  cancel(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.svc.cancel(+id, Number(req.user.userId));
  }
}
