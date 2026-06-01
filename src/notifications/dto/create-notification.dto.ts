import { IsInt, IsEnum, IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
    @ApiProperty()
    @IsInt()
    userId: number;

    @ApiProperty({ enum: NotificationType })
    @IsEnum(NotificationType)
    notificationType: NotificationType;

    @ApiProperty()
    @IsString()
    title: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    message?: string;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @IsBoolean()
    isRead?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    relatedEntityType?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    relatedEntityId?: number;
}
