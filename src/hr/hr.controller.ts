import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { HrService } from './hr.service';
import { SetSalaryDto } from './dto/set-salary.dto';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

const HR_ROLES = ['super_admin', 'hr'];

@ApiTags('HR Module')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hr')
export class HrController {
  constructor(private readonly hrService: HrService) {}

  // ── Employees + Performance ──

  @Get('employees')
  @Roles('super_admin', 'hr', 'operation_manager')
  @ApiOperation({ summary: 'List employees with attendance & performance (salary visible only to HR/super_admin)' })
  async getEmployees(@Request() req: any, @Query() paginationDto: PaginationDto) {
    if (HR_ROLES.includes(req.user?.role)) {
      return this.hrService.getEmployees(paginationDto);
    }
    return this.hrService.getEmployeesPublic(paginationDto);
  }

  @Patch('employees/:id/salary')
  @Roles('super_admin', 'hr')
  @ApiOperation({ summary: 'Set employee salary (HR / super_admin only)' })
  setSalary(@Param('id') id: string, @Body() dto: SetSalaryDto) {
    return this.hrService.setSalary(+id, dto);
  }

  // ── Policies ──

  @Get('policies')
  @Roles('super_admin', 'hr')
  @ApiOperation({ summary: 'List all HR policies' })
  getPolicies() {
    return this.hrService.getPolicies();
  }

  @Post('policies')
  @Roles('super_admin', 'hr')
  @ApiOperation({ summary: 'Create a new HR policy (shift times, grace, penalty)' })
  createPolicy(@Body() dto: CreatePolicyDto) {
    return this.hrService.createPolicy(dto);
  }

  @Patch('policies/:id')
  @Roles('super_admin', 'hr')
  @ApiOperation({ summary: 'Update an HR policy' })
  updatePolicy(@Param('id') id: string, @Body() dto: UpdatePolicyDto) {
    return this.hrService.updatePolicy(+id, dto);
  }

  @Delete('policies/:id')
  @Roles('super_admin', 'hr')
  @ApiOperation({ summary: 'Delete an HR policy' })
  deletePolicy(@Param('id') id: string) {
    return this.hrService.deletePolicy(+id);
  }

  // ── Payroll ──

  @Get('payroll')
  @Roles('super_admin', 'hr')
  @ApiOperation({ summary: 'Payroll summary: salary, deductions, net for each employee' })
  getPayroll() {
    return this.hrService.getPayrollSummary();
  }
  @Get('employee-profile/:userId')
  @Roles('super_admin', 'hr')
  @ApiOperation({ summary: 'Get comprehensive HR + Finance profile for a specific user' })
  getEmployeeProfile(@Param('userId') userId: string) {
    return this.hrService.getEmployeeProfile(Number(userId));
  }
}
