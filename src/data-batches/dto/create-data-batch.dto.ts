import { IsString, IsOptional, IsInt, IsDateString, IsNumber, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { DataQuality } from '@prisma/client';

export class CreateDataBatchDto {
    @ApiProperty()
    @IsString()
    batchName: string;

    @ApiProperty()
    @IsString()
    dataSource: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    purchaseDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @Transform(({ value }) => {
        if (value === '' || value === null || value === undefined) return undefined;
        const n = typeof value === 'number' ? value : Number(String(value).trim());
        return Number.isFinite(n) ? n : undefined;
    })
    @IsNumber({ maxDecimalPlaces: 2 }, { message: 'purchasePrice must be a valid number' })
    @Min(0)
    purchasePrice?: number;

    @ApiPropertyOptional({
        description: 'Declared list / purchase size; omit or 0 if unknown (e.g. filled from Excel row count on the client)',
        default: 0,
    })
    @IsOptional()
    @Type(() => Number)
    @Transform(({ value }) => {
        if (value === '' || value === null || value === undefined) return undefined;
        const n = typeof value === 'number' ? value : Number(String(value).trim());
        return Number.isFinite(n) ? n : undefined;
    })
    @IsInt()
    @Min(0)
    totalRecords?: number;

    @ApiPropertyOptional({ enum: DataQuality })
    @IsOptional()
    @IsEnum(DataQuality)
    quality?: DataQuality;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiProperty()
    @Type(() => Number)
    @IsInt()
    createdBy: number;

    @ApiPropertyOptional({ description: 'Marketing campaign — imports get lead type campaign' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    campaignId?: number;
}
