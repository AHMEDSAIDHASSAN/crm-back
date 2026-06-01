import { IsInt, IsEnum, IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadStatus } from '@prisma/client';

export class CreateLeadFeedbackDto {
    @ApiProperty()
    @IsInt()
    leadId: number;

    @ApiProperty()
    @IsInt()
    userId: number;

    @ApiProperty({ enum: LeadStatus })
    @IsEnum(LeadStatus)
    feedbackType: LeadStatus;

    @ApiProperty()
    @IsString()
    description: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    nextAction?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    nextActionDate?: string;

    @ApiPropertyOptional({ description: 'Call duration in seconds' })
    @IsOptional()
    @IsInt()
    callDuration?: number;
}
