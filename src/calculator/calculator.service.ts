import { Injectable } from '@nestjs/common';
import { CalculateDto } from './dto/calculate.dto';

const FREQUENCY_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  semi_annual: 6,
  annual: 12,
};

@Injectable()
export class CalculatorService {
  calculate(dto: CalculateDto) {
    const price = dto.totalPrice;
    if (price <= 0) {
      return this.emptyResult();
    }

    const adv = dto.advanced ?? {};
    const dpPct = dto.downPaymentPct ?? 0;

    let discountAmount = 0;
    if (adv.discount) {
      discountAmount =
        adv.discountType === 'percentage'
          ? price * (adv.discount / 100)
          : adv.discount;
    }

    const dpAfterDiscount = adv.downPaymentBefore !== 'before_discount';
    const baseForDownPayment = dpAfterDiscount ? price - discountAmount : price;
    const dpAmount = Math.max(0, baseForDownPayment * (dpPct / 100));

    let maintenanceAmount = 0;
    if (adv.maintenanceDeposit) {
      maintenanceAmount =
        adv.maintenanceType === 'percentage'
          ? price * (adv.maintenanceDeposit / 100)
          : adv.maintenanceDeposit;
    }

    let annualPaymentAmount = 0;
    if (adv.annualPayment) {
      annualPaymentAmount =
        adv.annualPaymentType === 'percentage'
          ? price * (adv.annualPayment / 100)
          : adv.annualPayment;
    }

    let deliveryPaymentAmount = 0;
    if (adv.deliveryPayment) {
      deliveryPaymentAmount =
        adv.deliveryPaymentType === 'percentage'
          ? price * (adv.deliveryPayment / 100)
          : adv.deliveryPayment;
    }

    /* financed principal after DP, discount, and lump deductions */
    const remainingAfterDp =
      price - discountAmount - dpAmount - maintenanceAmount - annualPaymentAmount - deliveryPaymentAmount;

    const installmentMode = dto.installmentMode ?? 'years';
    const totalMonths =
      installmentMode === 'years'
        ? (dto.installmentYears ?? 0) * 12 + (dto.extraMonths ?? 0)
        : (dto.extraMonths ?? 0);

    const freqMonths = FREQUENCY_MONTHS[dto.frequency] ?? 1;
    const totalPeriods = totalMonths > 0 ? Math.ceil(totalMonths / freqMonths) : 0;

    const r1 = adv.interestRate1 ?? 0;
    const r2 = adv.interestRate2 ?? 0;
    const r3 = adv.interestRate3 ?? 0;
    const rateCount = [r1, r2, r3].filter((r) => r > 0).length;
    const avgRate = rateCount > 0 ? (r1 + r2 + r3) / rateCount : 0;

    let installment = 0;
    let totalInterest = 0;

    if (totalPeriods > 0 && remainingAfterDp > 0) {
      if (avgRate > 0) {
        const r = avgRate / 100 / (12 / freqMonths);
        installment =
          (remainingAfterDp * r * Math.pow(1 + r, totalPeriods)) /
          (Math.pow(1 + r, totalPeriods) - 1);
        totalInterest = installment * totalPeriods - remainingAfterDp;
      } else {
        installment = remainingAfterDp / totalPeriods;
        totalInterest = 0;
      }
    }

    const totalAnnualInstallments = installment * (12 / freqMonths);
    const financingROI =
      remainingAfterDp > 0 ? (totalInterest / remainingAfterDp) * 100 : 0;
    const years = totalMonths / 12;
    const annualFinancingBurden = years > 0 ? financingROI / years : 0;

    return {
      downPaymentValue: this.round(dpAmount),
      downPaymentAmount: this.round(dpAmount),
      remainingAfterDownPayment: this.round(remainingAfterDp),
      discountAmount: this.round(discountAmount),
      maintenanceAmount: this.round(maintenanceAmount),
      annualPaymentAmount: this.round(annualPaymentAmount),
      deliveryPaymentAmount: this.round(deliveryPaymentAmount),
      installment: this.round(installment),
      totalAnnualInstallments: this.round(totalAnnualInstallments),
      totalInterest: this.round(totalInterest),
      financingROI: this.round(financingROI),
      annualFinancingBurden: this.round(annualFinancingBurden),
      totalMonths,
      totalPeriods,
      frequency: dto.frequency,
      avgInterestRate: this.round(avgRate),
    };
  }

  private round(n: number) {
    return Math.round(n * 100) / 100;
  }

  private emptyResult() {
    return {
      downPaymentValue: 0,
      downPaymentAmount: 0,
      remainingAfterDownPayment: 0,
      discountAmount: 0,
      maintenanceAmount: 0,
      annualPaymentAmount: 0,
      deliveryPaymentAmount: 0,
      installment: 0,
      totalAnnualInstallments: 0,
      totalInterest: 0,
      financingROI: 0,
      annualFinancingBurden: 0,
      totalMonths: 0,
      totalPeriods: 0,
      frequency: 'monthly',
      avgInterestRate: 0,
    };
  }
}
