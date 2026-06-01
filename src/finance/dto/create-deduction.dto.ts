import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSalesDeductionDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  userId: number;

  @ApiProperty({ example: 500 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 'Advance recovery' })
  @IsString()
  @MaxLength(500)
  reason: string;
}
