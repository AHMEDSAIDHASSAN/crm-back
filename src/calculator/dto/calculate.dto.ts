import {
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdvancedOptionsDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() interestRate1?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() interestRate2?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() interestRate3?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() maintenanceDeposit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() maintenanceType?: string; // 'fixed' | 'percentage'

  @ApiPropertyOptional() @IsOptional() @IsNumber() maintenanceCollectionTiming?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() maintenanceCollectionUnit?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() discountType?: string; // 'fixed' | 'percentage'

  @ApiPropertyOptional() @IsOptional() @IsString() downPaymentBefore?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() annualPayment?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() annualPaymentType?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() deliveryPayment?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryPaymentType?: string;
}

export class DeliveryPaymentDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() deliveryPayment1Value?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() deliveryPayment1Timing?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryPayment1Unit?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() deliveryPayment2Value?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() deliveryPayment2Timing?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryPayment2Unit?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() secondPayment?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() secondPaymentType?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() beforeFirstInstallment?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() afterDiscount?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() beforeDownPayment?: string;
}

export class CalculateDto {
  @ApiProperty({ description: 'Total unit price' })
  @IsNumber()
  totalPrice: number;

  @ApiProperty({ description: 'Down payment percentage' })
  @IsNumber()
  downPaymentPct: number;

  @ApiPropertyOptional({ description: '"years" or "months"' })
  @IsOptional()
  @IsString()
  installmentMode?: string;

  @ApiPropertyOptional({ description: 'Number of installment years' })
  @IsOptional()
  @IsNumber()
  installmentYears?: number;

  @ApiPropertyOptional({ description: 'Extra months' })
  @IsOptional()
  @IsNumber()
  extraMonths?: number;

  @ApiProperty({ description: 'Installment frequency: monthly | quarterly | semi_annual | annual' })
  @IsString()
  frequency: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => AdvancedOptionsDto)
  advanced?: AdvancedOptionsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  deliveryEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryPaymentDto)
  delivery?: DeliveryPaymentDto;
}
