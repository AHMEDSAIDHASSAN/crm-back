import { IsInt, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAuditDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    userId?: number;

    @ApiProperty()
    @IsString()
    action: string;

    @ApiProperty()
    @IsString()
    entityType: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    entityId?: number;

    @ApiPropertyOptional()
    @IsOptional()
    oldValues?: any;

    @ApiPropertyOptional()
    @IsOptional()
    newValues?: any;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    ipAddress?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    userAgent?: string;
}
