import { IsString, IsEmail, IsOptional, IsEnum, IsInt, MinLength, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus, SalesTitle } from '@prisma/client';

export class CreateUserDto {
    @ApiProperty()
    @IsEmail()
    email: string;

    @ApiProperty({ minLength: 8 })
    @IsString()
    @MinLength(8)
    password: string;

    @ApiProperty()
    @IsString()
    firstName: string;

    @ApiProperty()
    @IsString()
    lastName: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiProperty()
    @IsInt()
    roleId: number;

    @ApiPropertyOptional()
    @IsOptional()
    @ValidateIf((_, v) => v != null)
    @Type(() => Number)
    @IsInt()
    teamId?: number | null;

    @ApiPropertyOptional({ enum: SalesTitle })
    @IsOptional()
    @IsEnum(SalesTitle)
    title?: SalesTitle;

    @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.active })
    @IsOptional()
    @IsEnum(UserStatus)
    status?: UserStatus;
}
