import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DataType } from '@prisma/client';

export class CreateSettingDto {
    @ApiProperty()
    @IsString()
    settingKey: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    settingValue?: string;

    @ApiPropertyOptional({ enum: DataType, default: DataType.string })
    @IsOptional()
    @IsEnum(DataType)
    dataType?: DataType;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string;
}
