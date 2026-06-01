import { IsInt, IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceType } from '@prisma/client';

export class CreateUserSessionDto {
    @ApiProperty()
    @IsInt()
    userId: number;

    @ApiProperty()
    @IsString()
    sessionToken: string;

    @ApiProperty({ enum: DeviceType })
    @IsEnum(DeviceType)
    deviceType: DeviceType;

    @ApiPropertyOptional()
    @IsOptional()
    deviceInfo?: any;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    ipAddress?: string;

    @ApiProperty()
    @IsDateString()
    expiresAt: string;
}
