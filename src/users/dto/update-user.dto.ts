import { PartialType, OmitType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
    OmitType(CreateUserDto, ['password'] as const),
) {
    @ApiPropertyOptional({ minLength: 8, description: 'New password; omit to keep current' })
    @IsOptional()
    @IsString()
    @MinLength(8)
    password?: string;
}
