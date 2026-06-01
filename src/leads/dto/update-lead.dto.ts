import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { LeadAssignmentExpireAction } from '@prisma/client';
import { CreateLeadDto } from './create-lead.dto';

export class UpdateLeadDto extends PartialType(CreateLeadDto) {
    @ApiPropertyOptional({
        description:
            'Temporary assignment window in hours (from assign time). 0 clears timer. Requires assignmentExpireAction when > 0.',
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
