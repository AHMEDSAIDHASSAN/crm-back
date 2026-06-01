import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class SalesCheckOutDto {
  @ApiPropertyOptional({
    description: 'Check-out time in ISO format; if omitted server uses current time',
    example: '2026-04-10T17:05:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  checkOutTime?: string;

  @ApiPropertyOptional({
    description: 'Check-out location as text or coordinates',
    example: '30.0501,31.2402',
  })
  @IsOptional()
  @IsString()
  checkOutLocation?: string;

  @ApiPropertyOptional({ description: 'Optional note appended at checkout' })
  @IsOptional()
  @IsString()
  notes?: string;
}
