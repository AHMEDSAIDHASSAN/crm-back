import { IsString, MinLength, IsInt, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
    @ApiProperty()
    @IsString()
    @MinLength(2)
    name: string;

    @ApiProperty()
    @IsString()
    displayName: string;

    @ApiProperty({ description: 'Hierarchy level (1=Admin, 5=Sales)' })
    @IsInt()
    hierarchyLevel: number;

    @ApiPropertyOptional({ description: 'Permissions JSON structure' })
    @IsOptional()
    permissions?: any;
}
