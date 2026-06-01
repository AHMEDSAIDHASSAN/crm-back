import { IsInt, IsDateString, IsOptional, IsBoolean, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAttendanceDto {
    @ApiProperty()
    @IsInt()
    userId: number;

    @ApiProperty()
    @IsDateString()
    checkInTime: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    checkInLocation?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    checkOutTime?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    checkOutLocation?: string;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @IsBoolean()
    isLate?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    lateMinutes?: number;

    @ApiPropertyOptional({ description: 'Work duration in minutes' })
    @IsOptional()
    @IsInt()
    workDuration?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;
}
