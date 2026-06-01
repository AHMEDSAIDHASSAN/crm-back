import { IsString, IsOptional, IsDecimal, IsInt, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResaleUnitStatus } from '@prisma/client';

export class CreateResaleUnitDto {
    @ApiProperty()
    @IsString()
    code: string;

    @ApiProperty()
    @IsString()
    description: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    ownerName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    ownerPhone?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    location?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDecimal()
    askingPrice?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    bedrooms?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    bathrooms?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDecimal()
    area?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    unitType?: string;

    @ApiPropertyOptional()
    @IsOptional()
    amenities?: any;

    @ApiPropertyOptional()
    @IsOptional()
    images?: any;

    @ApiPropertyOptional({ enum: ResaleUnitStatus, default: ResaleUnitStatus.available })
    @IsOptional()
    @IsEnum(ResaleUnitStatus)
    status?: ResaleUnitStatus;

    @ApiProperty()
    @IsInt()
    createdBy: number;
}
