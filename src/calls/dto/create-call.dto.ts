import { IsInt, IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CallType, CallStatus, Platform } from '@prisma/client';

export class CreateCallDto {
    @ApiProperty()
    @IsInt()
    leadId: number;

    @ApiProperty()
    @IsInt()
    userId: number;

    @ApiPropertyOptional({ enum: CallType, default: CallType.outbound })
    @IsOptional()
    @IsEnum(CallType)
    callType?: CallType;

    @ApiProperty({ enum: CallStatus })
    @IsEnum(CallStatus)
    callStatus: CallStatus;

    @ApiPropertyOptional({ description: 'Duration in seconds' })
    @IsOptional()
    @IsInt()
    duration?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    recordingUrl?: string;

    @ApiProperty({ enum: Platform })
    @IsEnum(Platform)
    initiatedFrom: Platform;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    feedbackId?: number;
}
