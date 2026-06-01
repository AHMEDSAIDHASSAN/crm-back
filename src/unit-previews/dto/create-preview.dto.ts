import { IsString, IsOptional, IsInt, IsDateString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePreviewDto {
  @ApiProperty({ description: 'Unit ID to preview' })
  @Type(() => Number)
  @IsInt()
  unitId: number;

  @ApiProperty({ description: 'Client full name' })
  @IsString()
  @MaxLength(255)
  clientName: string;

  @ApiPropertyOptional({ description: 'Client phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  clientPhone?: string;

  @ApiProperty({ description: 'Scheduled date-time (ISO 8601)' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ description: 'Duration in minutes (default 60)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  durationMin?: number;

  @ApiPropertyOptional({ description: 'Notes about the visit' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
