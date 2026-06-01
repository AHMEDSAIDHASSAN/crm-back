import { IsString, IsInt, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeadRotationRuleDto {
    @ApiProperty()
    @IsString()
    ruleName: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    teamId?: number;

    @ApiProperty({ description: 'Time limit in hours' })
    @IsInt()
    timeLimitHours: number;

    @ApiPropertyOptional({ default: 3 })
    @IsOptional()
    @IsInt()
    maxNoAnswerAttempts?: number;

    @ApiPropertyOptional({ default: 7 })
    @IsOptional()
    @IsInt()
    noAnswerDaysThreshold?: number;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
