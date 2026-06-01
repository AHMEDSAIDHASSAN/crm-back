import { IsString, IsOptional, IsEnum, IsDateString, IsNumber, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CampaignPlatform, CampaignStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreateCampaignDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty({ enum: CampaignPlatform })
    @IsEnum(CampaignPlatform)
    platform: CampaignPlatform;

    @ApiPropertyOptional({ description: 'Custom platform label when platform=other' })
    @IsOptional()
    @IsString()
    platformLabel?: string;

    @ApiPropertyOptional({ description: 'Platform icon (emoji, URL, or short text)' })
    @IsOptional()
    @IsString()
    platformIcon?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    campaignIdExternal?: string;

    @ApiPropertyOptional({ enum: CampaignStatus, default: CampaignStatus.active })
    @IsOptional()
    @IsEnum(CampaignStatus)
    status?: CampaignStatus;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ description: 'Optional budget (omit or leave empty when unknown)' })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === '' || value === null || value === undefined) return undefined;
        const n = typeof value === 'number' ? value : Number(String(value).trim());
        if (!Number.isFinite(n)) return undefined;
        return n;
    })
    @IsNumber({ maxDecimalPlaces: 2 }, { message: 'budget must be a valid number' })
    @Min(0)
    budget?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    leadSourceId?: number;

    @ApiPropertyOptional({ description: 'Hours before rotation if fresh' })
    @IsOptional()
    @IsInt()
    timeLimit?: number;
}
