import { IsInt, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Platform } from '@prisma/client';

export class CreateWhatsappDto {
    @ApiProperty()
    @IsInt()
    leadId: number;

    @ApiProperty()
    @IsInt()
    userId: number;

    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @IsInt()
    messageCount?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    lastMessageAt?: string;

    @ApiProperty({ enum: Platform })
    @IsEnum(Platform)
    initiatedFrom: Platform;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    feedbackId?: number;
}
