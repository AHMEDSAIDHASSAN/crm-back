import { PartialType } from '@nestjs/swagger';
import { CreateResaleUnitDto } from './create-resale-unit.dto';

export class UpdateResaleUnitDto extends PartialType(CreateResaleUnitDto) { }
