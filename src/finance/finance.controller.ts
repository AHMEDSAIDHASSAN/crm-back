import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { FinanceService } from './finance.service';

const FINANCE_ROLES = ['super_admin', 'hr'];

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // ── SALES OVERVIEW ────────────────────────────────────────────────────────────

  @Get('sales-overview')
  @Roles('super_admin', 'hr')
  @ApiOperation({ summary: 'Sales team finance overview' })
  getSalesOverview() {
    return this.financeService.getSalesOverview();
  }

  @Post('deductions')
  @Roles(...FINANCE_ROLES)
  createDeduction(@Request() req: any, @Body() body: { userId: number; amount: number; reason: string }) {
    return this.financeService.createDeduction(body, Number(req.user.userId));
  }

  @Post('commissions')
  @Roles(...FINANCE_ROLES)
  createCommission(@Request() req: any, @Body() body: any) {
    return this.financeService.createCommission(body, Number(req.user.userId));
  }

  @Patch('commissions/:id/collect')
  @Roles(...FINANCE_ROLES)
  collectCommission(@Request() req: any, @Param('id') id: string) {
    return this.financeService.markCommissionCollected(Number(id), Number(req.user.userId));
  }

  @Post('commissions/from-rate')
  @Roles(...FINANCE_ROLES)
  @ApiOperation({ summary: 'Create commission with rate-based calculation' })
  createCommissionFromRate(@Request() req: any, @Body() body: any) {
    return this.financeService.createCommissionFromRate(body, Number(req.user.userId));
  }

  // ── COMMISSION RATES ──────────────────────────────────────────────────────────

  @Get('commission-rates')
  @Roles(...FINANCE_ROLES)
  @ApiOperation({ summary: 'List all commission rate templates' })
  listCommissionRates() {
    return this.financeService.listCommissionRates();
  }

  @Post('commission-rates')
  @Roles(...FINANCE_ROLES)
  @ApiOperation({ summary: 'Create commission rate template for a developer' })
  createCommissionRate(@Body() body: any) {
    return this.financeService.createCommissionRate(body);
  }

  @Patch('commission-rates/:id')
  @Roles(...FINANCE_ROLES)
  updateCommissionRate(@Param('id') id: string, @Body() body: any) {
    return this.financeService.updateCommissionRate(Number(id), body);
  }

  @Delete('commission-rates/:id')
  @Roles(...FINANCE_ROLES)
  deleteCommissionRate(@Param('id') id: string) {
    return this.financeService.deleteCommissionRate(Number(id));
  }

  // ── PAYROLL RUNS ──────────────────────────────────────────────────────────────

  @Get('payroll')
  @Roles(...FINANCE_ROLES)
  @ApiOperation({ summary: 'List all payroll runs' })
  listPayrollRuns() {
    return this.financeService.listPayrollRuns();
  }

  @Get('payroll/:month')
  @Roles(...FINANCE_ROLES)
  @ApiOperation({ summary: 'Get or create draft payroll for month YYYY-MM' })
  getPayrollRun(@Param('month') month: string) {
    return this.financeService.getPayrollRun(month);
  }

  @Post('payroll/:month/close')
  @Roles(...FINANCE_ROLES)
  @ApiOperation({ summary: 'Close/finalize payroll for a month' })
  closePayroll(@Request() req: any, @Param('month') month: string, @Body() body: { notes?: string }) {
    return this.financeService.closePayrollRun(month, Number(req.user.userId), body?.notes);
  }

  @Patch('payroll/entries/:id/pay')
  @Roles(...FINANCE_ROLES)
  @ApiOperation({ summary: 'Toggle paid status for a payroll entry' })
  markEntryPaid(@Param('id') id: string, @Body() body: { isPaid: boolean }) {
    return this.financeService.markEntryPaid(Number(id), body.isPaid);
  }

  // ── TRANSACTIONS ─────────────────────────────────────────────────────────────

  @Get('transactions')
  @Roles(...FINANCE_ROLES)
  listTransactions(@Query('month') month?: string, @Query('type') type?: string) {
    return this.financeService.listTransactions(month, type);
  }

  @Post('transactions')
  @Roles(...FINANCE_ROLES)
  createTransaction(@Request() req: any, @Body() body: any) {
    return this.financeService.createTransaction(body, Number(req.user.userId));
  }

  @Delete('transactions/:id')
  @Roles(...FINANCE_ROLES)
  deleteTransaction(@Param('id') id: string) {
    return this.financeService.deleteTransaction(Number(id));
  }

  // ── FIXED BILLS ───────────────────────────────────────────────────────────────

  @Get('fixed-bills')
  @Roles(...FINANCE_ROLES)
  listFixedBills() {
    return this.financeService.listFixedBills();
  }

  @Post('fixed-bills')
  @Roles(...FINANCE_ROLES)
  createFixedBill(@Body() body: any) {
    return this.financeService.createFixedBill(body);
  }

  @Patch('fixed-bills/:id')
  @Roles(...FINANCE_ROLES)
  updateFixedBill(@Param('id') id: string, @Body() body: any) {
    return this.financeService.updateFixedBill(Number(id), body);
  }

  @Delete('fixed-bills/:id')
  @Roles(...FINANCE_ROLES)
  deleteFixedBill(@Param('id') id: string) {
    return this.financeService.deleteFixedBill(Number(id));
  }

  // ── DASHBOARD ─────────────────────────────────────────────────────────────────

  @Get('dashboard')
  @Roles(...FINANCE_ROLES)
  getDashboard(@Query('month') month?: string) {
    const m = month ?? new Date().toISOString().slice(0, 7);
    return this.financeService.getDashboard(m);
  }
}
