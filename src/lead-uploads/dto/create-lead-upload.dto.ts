import { IsInt, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UploadStatus } from '@prisma/client';

export class CreateLeadUploadDto {
    @ApiProperty()
    @IsInt()
    uploadedBy: number;

    @ApiProperty()
    @IsString()
    fileName: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    filePath?: string;

    @ApiProperty()
    @IsInt()
    totalRows: number;

    @ApiPropertyOptional({ default: 0 })
    @IsOptional()
    @IsInt()
    successfulImports?: number;

    @ApiPropertyOptional({ default: 0 })
    @IsOptional()
    @IsInt()
    failedImports?: number;

    @ApiPropertyOptional({ enum: UploadStatus, default: UploadStatus.processing })
    @IsOptional()
    @IsEnum(UploadStatus)
    status?: UploadStatus;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    dataBatchId?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    errorLog?: string;
}
