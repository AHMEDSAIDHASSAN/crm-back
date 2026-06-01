import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Meetings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) { }

  @Get('stats')
  @ApiOperation({ summary: 'Meeting statistics (super_admin / operation_manager): total, completed, by team, by role, by user' })
  getStats(@Request() req: any) {
    return this.meetingsService.getStats(req.user?.userId, req.user?.role);
  }

  @Get('qualified-leads')
  @ApiOperation({ summary: 'Get qualified leads for scheduling (role-based: all for super_admin, subordinates for OM/SM/TL, own for sales)' })
  getQualifiedLeads(@Request() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    const p = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const l = limit ? Math.min(50, Math.max(1, parseInt(limit, 10) || 10)) : 10;
    return this.meetingsService.getQualifiedLeads(req.user?.userId, req.user?.role, p, l);
  }

  @Post()
  @ApiOperation({ summary: 'Schedule a new meeting (super_admin/operation_manager can pass scheduledBy to schedule on behalf)' })
  create(@Body() createMeetingDto: CreateMeetingDto, @Request() req: any) {
    return this.meetingsService.create(createMeetingDto, req.user?.userId, req.user?.role);
  }

  @Get()
  @ApiOperation({ summary: 'Get meetings (role-based list; optional userId; teamId filters to visible teams for each role)' })
  findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('teamId') teamId?: string,
  ) {
    const p = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const l = limit ? Math.min(50, Math.max(1, parseInt(limit, 10) || 10)) : 10;
    return this.meetingsService.findAll(req.user?.userId, req.user?.role, p, l, userId, teamId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a meeting by ID' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.meetingsService.findOne(+id, req.user?.userId, req.user?.role);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a meeting (e.g. start, end, feedback)' })
  update(@Param('id') id: string, @Body() updateMeetingDto: UpdateMeetingDto, @Request() req: any) {
    return this.meetingsService.update(+id, updateMeetingDto, req.user?.userId, req.user?.role);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel/Delete a meeting' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.meetingsService.remove(+id, req.user?.userId, req.user?.role);
  }
}
