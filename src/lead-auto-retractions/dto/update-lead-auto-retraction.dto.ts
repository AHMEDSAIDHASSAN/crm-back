import { PartialType } from '@nestjs/swagger';
import { CreateLeadAutoRetractionDto } from './create-lead-auto-retraction.dto';

export class UpdateLeadAutoRetractionDto extends PartialType(CreateLeadAutoRetractionDto) { }
