import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsNumber,
  IsDateString,
  IsArray,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UnitStatus } from '@prisma/client';

export class CreateUnitDto {
  @ApiPropertyOptional({
    description: 'Omit to auto-generate a unique code (recommended)',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Short unit / listing address line' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: 'Monthly installment' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  monthlyInstallment?: number;

  @ApiPropertyOptional({ description: 'Delivery / handover date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  bedrooms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  bathrooms?: number;

  @ApiPropertyOptional({ description: 'Floor number (building level)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  floor?: number;

  @ApiPropertyOptional({ description: 'Area in sqm or sqft' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  area?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unitType?: string;

  @ApiPropertyOptional({
    description: 'Google Drive (or similar) link to media / documents — paste share link',
    maxLength: 1024,
  })
  @IsOptional()
  @IsString()
  driveMediaLink?: string;

  @ApiPropertyOptional({ description: 'Amenity labels (e.g. tags)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(64)
  amenities?: string[];

  @ApiPropertyOptional({
    description: 'External URLs (listings, walkthroughs, etc.)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(32)
  externalLinks?: string[];

  @ApiPropertyOptional({ enum: UnitStatus, default: UnitStatus.available })
  @IsOptional()
  @IsEnum(UnitStatus)
  status?: UnitStatus;
}
