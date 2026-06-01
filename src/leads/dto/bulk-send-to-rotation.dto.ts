import { IsArray, IsBoolean, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkSendToRotationDto {
  @ApiProperty({ example: [1, 2, 3], description: 'Lead IDs to unassign and mark as rotation' })
  @IsArray()
  @IsNumber({}, { each: true })
  leadIds: number[];

  @ApiPropertyOptional({
    example: false,
    description: 'When true, move blocked leads even if they already have meetings or feedback',
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
