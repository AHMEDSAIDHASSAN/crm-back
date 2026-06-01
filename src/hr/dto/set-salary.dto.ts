import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class SetSalaryDto {
  @ApiProperty({ description: 'Monthly salary in EGP', example: 15000 })
  @IsNumber()
  @Min(0)
  salary: number;
}
