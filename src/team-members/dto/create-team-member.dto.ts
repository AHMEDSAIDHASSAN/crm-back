import { IsInt, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTeamMemberDto {
    @ApiProperty()
    @IsInt()
    teamId: number;

    @ApiProperty()
    @IsInt()
    userId: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    joinedAt?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    leftAt?: string;
}
