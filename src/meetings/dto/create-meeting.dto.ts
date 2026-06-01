import { IsInt, IsDateString, IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MeetingType, MeetingStatus } from '@prisma/client';

export class CreateMeetingDto {
    @ApiProperty()
    @IsInt()
    leadId: number;

    @ApiPropertyOptional({
        description:
            'User the meeting is attributed to (must match the lead assignee). Super admin / operation manager: set via "Schedule for". Tech lead / sales manager: usually the lead assignee, sent from the client.',
    })
    @IsOptional()
    @IsInt()
    scheduledBy?: number;

    @ApiProperty()
    @IsDateString()
    meetingDate: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    location?: string;

    @ApiProperty({ enum: MeetingType })
    @IsEnum(MeetingType)
    meetingType: MeetingType;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @IsBoolean()
    isPrivate?: boolean;

    @ApiPropertyOptional({ enum: MeetingStatus, default: MeetingStatus.scheduled })
    @IsOptional()
    @IsEnum(MeetingStatus)
    status?: MeetingStatus;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;
}
