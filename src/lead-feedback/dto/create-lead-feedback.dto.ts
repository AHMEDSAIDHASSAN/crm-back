import { IsInt, IsEnum, IsString, IsOptional, IsDateString, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadStatus } from '@prisma/client';

export class CreateLeadFeedbackDto {
    @ApiProperty()
    @IsInt()
    leadId: number;

    @ApiProperty()
    @IsInt()
    userId: number;

    @ApiProperty()
    @IsIn(['new_lead', 'cold_call', 'follow_up', 'qualified', 'no_answer', 'wrong_number', 'not_interested', 'purchased', 'assigned', 'rotation'])
    feedbackType: string;

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
