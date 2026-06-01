import { IsArray, IsNumber, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadAssignmentExpireAction } from '@prisma/client';

export enum AssignmentMode {
    STANDARD = 'standard',
    CUSTOMIZE = 'customize',
}

export class BulkAssignLeadsDto {
    @ApiProperty({ example: [1, 2, 3], description: 'Array of lead IDs to assign' })
    @IsArray()
    @IsNumber({}, { each: true })
    leadIds: number[];

    @ApiProperty({ example: 4, description: 'User ID to assign the leads to' })
    @IsNumber()
    assignedTo: number;

    @ApiProperty({ enum: AssignmentMode, default: AssignmentMode.STANDARD })
    @IsEnum(AssignmentMode)
    @IsOptional()
    assignmentMode?: AssignmentMode;

    @ApiPropertyOptional({
        description:
            'Optional: keep this assignment only for N hours; when it ends, assignmentExpireAction runs (rotation or backup_sales). Omit or 0 for a normal (no expiry) assignment.',
        minimum: 0,
        maximum: 8760,
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(8760)
    assignmentDurationHours?: number;

    @ApiPropertyOptional({ enum: LeadAssignmentExpireAction })
    @IsOptional()
    @IsEnum(LeadAssignmentExpireAction)
    assignmentExpireAction?: LeadAssignmentExpireAction;

    @ApiPropertyOptional({ description: 'Required when assignmentExpireAction is backup_sales' })
    @IsOptional()
    @IsInt()
    backupAssignUserId?: number;
}
