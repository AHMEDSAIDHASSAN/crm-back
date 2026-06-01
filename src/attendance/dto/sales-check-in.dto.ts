import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class SalesCheckInDto {
  @ApiPropertyOptional({
    description: 'Check-in time in ISO format; if omitted server uses current time',
    example: '2026-04-10T08:55:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  checkInTime?: string;

  @ApiPropertyOptional({
    description: 'Check-in location as text or coordinates',
    example: '30.0444,31.2357',
  })
  @IsOptional()
  @IsString()
  checkInLocation?: string;

  @ApiPropertyOptional({ description: 'Optional note for this attendance record' })
  @IsOptional()
  @IsString()
  notes?: string;
}
