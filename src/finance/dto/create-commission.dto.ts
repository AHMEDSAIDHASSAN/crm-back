import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSalesCommissionDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  userId: number;

  @ApiProperty({ example: 'Villa sale — Project X' })
  @IsString()
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional({ description: 'Commission value in EGP (optional)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiProperty({ example: '2026-04-01', description: 'Date the sale was completed' })
  @IsString()
  saleDate: string;

  @ApiPropertyOptional({
    example: 'قريباً — after developer payout',
    description: 'Flexible due / payout note (not a strict date)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  dueNote?: string;
}
