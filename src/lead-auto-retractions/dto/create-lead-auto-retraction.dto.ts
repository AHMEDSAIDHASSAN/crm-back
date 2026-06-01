import { IsInt, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeadAutoRetractionDto {
    @ApiProperty()
    @IsInt()
    leadId: number;

    @ApiProperty()
    @IsInt()
    previousOwner: number;

    @ApiProperty()
    @IsString()
    reason: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    timeWithoutFeedbackHours?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    reassignedTo?: number;
}
