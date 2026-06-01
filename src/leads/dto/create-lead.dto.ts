import { IsString, IsEmail, IsOptional, IsEnum, IsInt, IsBoolean, IsJSON, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadStatus, LeadPriority, AssignmentMode, LeadType } from '@prisma/client';

const LEAD_STATUS_VALUES = ['new_lead', 'cold_call', 'follow_up', 'qualified', 'no_answer', 'wrong_number', 'not_interested', 'purchased', 'assigned', 'rotation'] as const;

export class CreateLeadDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    firstName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    lastName?: string;

    @ApiProperty()
    @IsString()
    phone: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    leadSourceId?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    campaignId?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    dataBatchId?: number;

    @ApiPropertyOptional({ enum: LeadStatus, default: LeadStatus.new_lead })
    @IsOptional()
    @IsIn(LEAD_STATUS_VALUES)
    status?: LeadStatus;

    @ApiPropertyOptional({ enum: LeadPriority, default: LeadPriority.medium })
    @IsOptional()
    @IsEnum(LeadPriority)
    priority?: LeadPriority;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isStarred?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    assignedTo?: number;

    @ApiPropertyOptional({ enum: AssignmentMode, default: AssignmentMode.standard })
    @IsOptional()
    @IsEnum(AssignmentMode)
    assignmentMode?: AssignmentMode;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    teamId?: number;

    @ApiPropertyOptional()
    @IsOptional()
    propertyPreferences?: any;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    leadFront?: boolean;

    @ApiPropertyOptional({ enum: LeadType, default: LeadType.primary })
    @IsOptional()
    @IsEnum(LeadType)
    type?: LeadType;
}
