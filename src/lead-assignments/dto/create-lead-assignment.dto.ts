import { IsInt, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssignmentType } from '@prisma/client';

export class CreateLeadAssignmentDto {
    @ApiProperty()
    @IsInt()
    leadId: number;

    @ApiProperty()
    @IsInt()
    assignedTo: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    assignedBy?: number;

    @ApiProperty({ enum: AssignmentType })
    @IsEnum(AssignmentType)
    assignmentType: AssignmentType;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    reason?: string;
}
