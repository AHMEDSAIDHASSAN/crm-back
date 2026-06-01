import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadSourceType } from '@prisma/client';

export class CreateLeadSourceDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty({ enum: LeadSourceType })
    @IsEnum(LeadSourceType)
    type: LeadSourceType;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    platform?: string;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
