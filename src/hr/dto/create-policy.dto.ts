import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePolicyDto {
  @ApiProperty({ description: 'Policy name', example: 'Morning Shift' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Shift start (HH:mm)', example: '09:00' })
  @IsString()
  shiftStartTime: string;

  @ApiProperty({ description: 'Shift end (HH:mm)', example: '17:00' })
  @IsString()
  shiftEndTime: string;

  @ApiPropertyOptional({ description: 'Grace minutes before marking late', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  graceMinutes?: number;

  @ApiProperty({ description: 'EGP deducted per late hour', example: 50 })
  @IsNumber()
  @Min(0)
  penaltyPerHour: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
