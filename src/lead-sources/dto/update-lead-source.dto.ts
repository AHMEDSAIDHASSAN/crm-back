import { PartialType } from '@nestjs/swagger';
import { CreateLeadSourceDto } from './create-lead-source.dto';

export class UpdateLeadSourceDto extends PartialType(CreateLeadSourceDto) { }
