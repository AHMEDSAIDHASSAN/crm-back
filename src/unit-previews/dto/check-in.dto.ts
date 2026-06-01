import { IsOptional, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CheckInDto {
  @ApiPropertyOptional({ description: 'Latitude of check-in location' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude of check-in location' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;
}

export class CheckOutDto {
  @ApiPropertyOptional({ description: 'Latitude of check-out location' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude of check-out location' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;
}
