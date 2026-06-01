import { Controller, Get, Post, Body, Patch, Param, Delete, Request, UseGuards, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { SalesCheckInDto } from './dto/sales-check-in.dto';
import { SalesCheckOutDto } from './dto/sales-check-out.dto';

@ApiTags('Attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) { }

  @Post('sales/check-in')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('sales')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sales check-in (creates attendance log)' })
  @ApiBody({ type: SalesCheckInDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Only sales role can access this endpoint' })
  salesCheckIn(@Request() req: { user: { userId: string } }, @Body() body: SalesCheckInDto) {
    return this.attendanceService.salesCheckIn(Number(req.user.userId), body);
  }

  @Post('sales/check-out')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('sales')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sales check-out (closes latest open attendance log)' })
  @ApiBody({ type: SalesCheckOutDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Only sales role can access this endpoint' })
  salesCheckOut(@Request() req: { user: { userId: string } }, @Body() body: SalesCheckOutDto) {
    return this.attendanceService.salesCheckOut(Number(req.user.userId), body);
  }

  @Post()
  @ApiOperation({ summary: 'Record attendance check-in' })
  create(@Body() createAttendanceDto: CreateAttendanceDto) {
    return this.attendanceService.create(createAttendanceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all attendance logs' })
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query('date') date?: string,
    @Query('teamId') teamId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.attendanceService.findAll(
      paginationDto,
      date,
      teamId ? Number(teamId) : undefined,
      userId ? Number(userId) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an attendance log by ID' })
  findOne(@Param('id') id: string) {
    return this.attendanceService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an attendance log' })
  update(@Param('id') id: string, @Body() updateAttendanceDto: UpdateAttendanceDto) {
    return this.attendanceService.update(+id, updateAttendanceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an attendance log' })
  remove(@Param('id') id: string) {
    return this.attendanceService.remove(+id);
  }
}
