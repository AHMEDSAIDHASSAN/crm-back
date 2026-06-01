import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';

const SALES_ROLE = 'sales';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  private async assertSalesUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      include: { role: { select: { name: true } } },
    });
    if (!user) throw new NotFoundException(`User #${userId} not found`);
    if (user.role.name !== SALES_ROLE) {
      throw new BadRequestException('Finance records apply to sales team members only');
    }
    return user;
  }

  /** Sales roster with basic salary, all deductions, commissions, and totals. */
  async getSalesOverview() {
    const salesUsers = await this.prisma.user.findMany({
      where: { role: { name: SALES_ROLE }, status: 'active' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        salary: true,
        title: true,
        team: { select: { id: true, name: true } },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    const ids = salesUsers.map((u) => u.id);
    if (ids.length === 0) return { employees: [] };

    const [deductions, commissions] = await Promise.all([
      this.prisma.salesSalaryDeduction.findMany({
        where: { userId: { in: ids } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.salesCommission.findMany({
        where: { userId: { in: ids } },
        orderBy: { saleDate: 'desc' },
      }),
    ]);

    const dedByUser = new Map<string, typeof deductions>();
    const comByUser = new Map<string, typeof commissions>();
    for (const d of deductions) {
      const k = d.userId.toString();
      if (!dedByUser.has(k)) dedByUser.set(k, []);
      dedByUser.get(k)!.push(d);
    }
    for (const c of commissions) {
      const k = c.userId.toString();
      if (!comByUser.has(k)) comByUser.set(k, []);
      comByUser.get(k)!.push(c);
    }

    return {
      employees: salesUsers.map((u) => {
        const uid = u.id.toString();
        const dlist = dedByUser.get(uid) ?? [];
        const clist = comByUser.get(uid) ?? [];
        const deductionsTotal = dlist.reduce((s, d) => s + Number(d.amount), 0);
        const basicSalary = Number(u.salary ?? 0);
        const pendingCommissions = clist.filter((c) => c.status === 'pending_collection');
        const collectedCommissions = clist.filter((c) => c.status === 'collected');
        return {
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          phone: u.phone,
          title: u.title,
          team: u.team,
          basicSalary,
          deductions: dlist.map((d) => ({
            id: d.id,
            amount: Number(d.amount),
            reason: d.reason,
            createdAt: d.createdAt,
          })),
          deductionsTotal,
          netAfterDeductions: Math.max(0, basicSalary - deductionsTotal),
          commissions: clist.map((c) => ({
            id: c.id,
            title: c.title,
            amount: c.amount != null ? Number(c.amount) : null,
            saleDate: c.saleDate,
            dueNote: c.dueNote,
            status: c.status,
            collectedAt: c.collectedAt,
            createdAt: c.createdAt,
          })),
          commissionsPendingCount: pendingCommissions.length,
          commissionsCollectedCount: collectedCommissions.length,
        };
      }),
    };
  }

  async createDeduction(dto: { userId: number; amount: number; reason: string }, actorId: number) {
    await this.assertSalesUser(dto.userId);
    return this.prisma.salesSalaryDeduction.create({
      data: {
        userId: BigInt(dto.userId),
        amount: dto.amount,
        reason: dto.reason.trim(),
        createdById: BigInt(actorId),
      },
    });
  }

  async createCommission(
    dto: {
      userId: number;
      title: string;
      saleDate: string;
      dueNote?: string;
      amount?: number;
    },
    actorId: number,
  ) {
    await this.assertSalesUser(dto.userId);
    const saleDate = new Date(dto.saleDate);
    if (Number.isNaN(saleDate.getTime())) {
      throw new BadRequestException('Invalid sale date');
    }
    return this.prisma.salesCommission.create({
      data: {
        userId: BigInt(dto.userId),
        title: dto.title.trim(),
        saleDate,
        dueNote: dto.dueNote?.trim() || null,
        amount: dto.amount != null ? dto.amount : null,
        createdById: BigInt(actorId),
      },
    });
  }

  async markCommissionCollected(id: number, _actorId: number) {
    const row = await this.prisma.salesCommission.findUnique({
      where: { id: BigInt(id) },
    });
    if (!row) throw new NotFoundException(`Commission #${id} not found`);
    if (row.status === 'collected') {
      throw new BadRequestException('Commission is already marked as collected');
    }
    return this.prisma.salesCommission.update({
      where: { id: BigInt(id) },
      data: { status: 'collected', collectedAt: new Date() },
    });
  }

  // ── COMMISSION RATES ─────────────────────────────────────────────────────────

  async listCommissionRates() {
    const rates = await this.prisma.commissionRate.findMany({
      orderBy: [{ isActive: 'desc' }, { developerName: 'asc' }],
    });
    return rates.map(r => ({
      ...r,
      companyRatePct: Number(r.companyRatePct),
      salesRatePct: Number(r.salesRatePct),
      taxRatePct: Number(r.taxRatePct),
    }));
  }

  async createCommissionRate(dto: {
    developerName: string;
    companyRatePct: number;
    salesRatePct: number;
    taxRatePct?: number;
    notes?: string;
  }) {
    return this.prisma.commissionRate.create({
      data: {
        developerName: dto.developerName.trim(),
        companyRatePct: dto.companyRatePct,
        salesRatePct: dto.salesRatePct,
        taxRatePct: dto.taxRatePct ?? 0,
        notes: dto.notes?.trim() || null,
      },
    });
  }

  async updateCommissionRate(id: number, dto: Partial<{
    developerName: string;
    companyRatePct: number;
    salesRatePct: number;
    taxRatePct: number;
    isActive: boolean;
    notes: string;
  }>) {
    const rate = await this.prisma.commissionRate.findUnique({ where: { id } });
    if (!rate) throw new NotFoundException(`Commission rate #${id} not found`);
    return this.prisma.commissionRate.update({ where: { id }, data: dto as any });
  }

  async deleteCommissionRate(id: number) {
    const rate = await this.prisma.commissionRate.findUnique({ where: { id } });
    if (!rate) throw new NotFoundException(`Commission rate #${id} not found`);
    return this.prisma.commissionRate.delete({ where: { id } });
  }

  /** Create a commission using a rate template — auto-calculates amounts. */
  async createCommissionFromRate(dto: {
    userId: number;
    title: string;
    saleDate: string;
    unitPrice: number;
    commissionRateId?: number;
    companyRatePct: number;
    salesRatePct: number;
    taxRatePct?: number;
    dueNote?: string;
  }, actorId: number) {
    await this.assertSalesUser(dto.userId);
    const saleDate = new Date(dto.saleDate);
    if (Number.isNaN(saleDate.getTime())) throw new BadRequestException('Invalid sale date');

    const companyRatePct = dto.companyRatePct;
    const salesRatePct = dto.salesRatePct;
    const taxRatePct = dto.taxRatePct ?? 0;

    // companyAmount = unitPrice × companyRate%
    const companyAmount = (dto.unitPrice * companyRatePct) / 100;
    // salesAmount = companyAmount × salesRate%
    const salesAmount = (companyAmount * salesRatePct) / 100;
    // taxAmount = salesAmount × taxRate%
    const taxAmount = (salesAmount * taxRatePct) / 100;
    // net to salesperson
    const netAmount = salesAmount - taxAmount;

    let developerName: string | undefined;
    if (dto.commissionRateId) {
      const rate = await this.prisma.commissionRate.findUnique({ where: { id: dto.commissionRateId } });
      developerName = rate?.developerName;
    }

    return this.prisma.salesCommission.create({
      data: {
        userId: BigInt(dto.userId),
        title: dto.title.trim(),
        saleDate,
        dueNote: dto.dueNote?.trim() || null,
        developerName: developerName || null,
        commissionRateId: dto.commissionRateId || null,
        unitPrice: dto.unitPrice,
        companyRatePct,
        salesRatePct,
        taxRatePct,
        companyAmount,
        salesAmount,
        taxAmount,
        amount: netAmount, // salesperson net = legacy amount field
        createdById: BigInt(actorId),
      },
      include: {
        commissionRate: { select: { id: true, developerName: true } },
      },
    });
  }

  // ── PAYROLL RUNS ─────────────────────────────────────────────────────────────

  /** Get or create a draft payroll run for a given month (YYYY-MM).
   *  Pulls all active employees, their current salary, and month deductions. */
  async getPayrollRun(month: string) {
    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) throw new BadRequestException('Month must be YYYY-MM');

    let run = await this.prisma.payrollRun.findUnique({
      where: { month },
      include: {
        entries: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true, salary: true, role: { select: { name: true, displayName: true } }, team: { select: { name: true } } } } },
          orderBy: { createdAt: 'asc' },
        },
        closedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!run) {
      // Create draft run with all active employees
      run = await this._createDraftRun(month);
    }

    return this._serializeRun(run);
  }

  private async _createDraftRun(month: string) {
    const [year, mon] = month.split('-').map(Number);
    const startOfMonth = new Date(year, mon - 1, 1);
    const endOfMonth = new Date(year, mon, 0, 23, 59, 59, 999);

    const users = await this.prisma.user.findMany({
      where: { status: 'active' },
      select: {
        id: true, firstName: true, lastName: true, email: true, salary: true,
        role: { select: { name: true, displayName: true } },
        team: { select: { name: true } },
        salaryDeductions: {
          where: { createdAt: { gte: startOfMonth, lte: endOfMonth } },
          select: { amount: true },
        },
      },
      orderBy: { firstName: 'asc' },
    });

    let totalGross = 0, totalDeductions = 0, totalNet = 0;
    const entries = users.map((u) => {
      const base = Number(u.salary ?? 0);
      const ded = u.salaryDeductions.reduce((s, d) => s + Number(d.amount), 0);
      const net = Math.max(0, base - ded);
      totalGross += base;
      totalDeductions += ded;
      totalNet += net;
      return { userId: u.id, baseSalary: base, deductions: ded, netSalary: net };
    });

    return this.prisma.payrollRun.create({
      data: {
        month,
        totalGross,
        totalDeductions,
        totalNet,
        entries: { create: entries },
      },
      include: {
        entries: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true, salary: true, role: { select: { name: true, displayName: true } }, team: { select: { name: true } } } } },
        },
        closedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  private _serializeRun(run: any) {
    return {
      id: run.id,
      month: run.month,
      status: run.status,
      totalGross: Number(run.totalGross),
      totalDeductions: Number(run.totalDeductions),
      totalNet: Number(run.totalNet),
      closedAt: run.closedAt,
      closedBy: run.closedBy,
      notes: run.notes,
      entries: run.entries.map((e: any) => ({
        id: e.id,
        userId: e.userId,
        user: e.user,
        baseSalary: Number(e.baseSalary),
        deductions: Number(e.deductions),
        netSalary: Number(e.netSalary),
        isPaid: e.isPaid,
        paidAt: e.paidAt,
        notes: e.notes,
      })),
    };
  }

  async closePayrollRun(month: string, actorId: number, notes?: string) {
    const run = await this.prisma.payrollRun.findUnique({ where: { month } });
    if (!run) throw new NotFoundException(`No payroll run for ${month}`);
    if (run.status === 'CLOSED') throw new BadRequestException('Payroll already closed');
    return this.prisma.payrollRun.update({
      where: { month },
      data: { status: 'CLOSED', closedAt: new Date(), closedById: BigInt(actorId), notes: notes ?? null },
      include: {
        entries: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        closedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async markEntryPaid(entryId: number, isPaid: boolean) {
    const entry = await this.prisma.payrollEntry.findUnique({ where: { id: BigInt(entryId) } });
    if (!entry) throw new NotFoundException(`Entry #${entryId} not found`);
    return this.prisma.payrollEntry.update({
      where: { id: BigInt(entryId) },
      data: { isPaid, paidAt: isPaid ? new Date() : null },
    });
  }

  async listPayrollRuns() {
    const runs = await this.prisma.payrollRun.findMany({
      orderBy: { month: 'desc' },
      include: { closedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
    return runs.map((r) => ({ ...r, totalGross: Number(r.totalGross), totalDeductions: Number(r.totalDeductions), totalNet: Number(r.totalNet) }));
  }

  // ── FINANCE TRANSACTIONS ──────────────────────────────────────────────────────

  async listTransactions(month?: string, type?: string) {
    const where: any = {};
    if (month) where.month = month;
    if (type) where.type = type;
    const rows = await this.prisma.financeTransaction.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
    });
    return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
  }

  async createTransaction(dto: { type: 'INCOME' | 'EXPENSE'; category: string; amount: number; description?: string; date?: string; department?: string }, actorId: number) {
    const date = dto.date ? new Date(dto.date) : new Date();
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return this.prisma.financeTransaction.create({
      data: {
        type: dto.type,
        category: dto.category,
        amount: dto.amount,
        description: dto.description ?? null,
        date,
        month,
        department: dto.department ?? null,
        createdById: BigInt(actorId),
      },
    });
  }

  async deleteTransaction(id: number) {
    const row = await this.prisma.financeTransaction.findUnique({ where: { id: BigInt(id) } });
    if (!row) throw new NotFoundException(`Transaction #${id} not found`);
    return this.prisma.financeTransaction.delete({ where: { id: BigInt(id) } });
  }

  // ── FIXED BILLS ───────────────────────────────────────────────────────────────

  async listFixedBills() {
    return this.prisma.fixedBill.findMany({ orderBy: [{ isActive: 'desc' }, { dueDay: 'asc' }] });
  }

  async createFixedBill(dto: { name: string; category: string; amount: number; dueDay?: number; notes?: string }) {
    return this.prisma.fixedBill.create({
      data: { name: dto.name, category: dto.category, amount: dto.amount, dueDay: dto.dueDay ?? 1, notes: dto.notes ?? null },
    });
  }

  async updateFixedBill(id: number, dto: Partial<{ name: string; category: string; amount: number; dueDay: number; isActive: boolean; notes: string }>) {
    const row = await this.prisma.fixedBill.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Fixed bill #${id} not found`);
    return this.prisma.fixedBill.update({ where: { id }, data: dto as any });
  }

  async deleteFixedBill(id: number) {
    const row = await this.prisma.fixedBill.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Fixed bill #${id} not found`);
    return this.prisma.fixedBill.delete({ where: { id } });
  }

  // ── DASHBOARD SUMMARY ─────────────────────────────────────────────────────────

  async getDashboard(month: string) {
    if (!/^\d{4}-\d{2}$/.test(month)) throw new BadRequestException('Month must be YYYY-MM');

    const [transactions, payrollRun, fixedBills] = await Promise.all([
      this.prisma.financeTransaction.findMany({ where: { month } }),
      this.prisma.payrollRun.findUnique({ where: { month } }),
      this.prisma.fixedBill.findMany({ where: { isActive: true } }),
    ]);

    const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
    const totalExpenses = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
    const fixedBillsTotal = fixedBills.reduce((s, b) => s + Number(b.amount), 0);
    const payrollCost = payrollRun ? Number(payrollRun.totalNet) : 0;
    const totalOutflow = totalExpenses + fixedBillsTotal + payrollCost;
    const balance = totalIncome - totalOutflow;

    // By category breakdown for expenses
    const expenseByCategory: Record<string, number> = {};
    for (const t of transactions.filter(t => t.type === 'EXPENSE')) {
      expenseByCategory[t.category] = (expenseByCategory[t.category] ?? 0) + Number(t.amount);
    }

    return {
      month,
      totalIncome,
      totalExpenses,
      fixedBillsTotal,
      payrollCost,
      totalOutflow,
      balance,
      payrollStatus: payrollRun?.status ?? null,
      payrollPaidCount: 0,
      expenseByCategory,
      transactionCount: transactions.length,
    };
  }
}
