import { IsString, IsOptional, IsInt, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TeamStatus } from '@prisma/client';

export class CreateTeamDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    teamLeaderId?: number;

    @ApiPropertyOptional({ enum: TeamStatus, default: TeamStatus.active })
    @IsOptional()
    @IsEnum(TeamStatus)
    status?: TeamStatus;
}
