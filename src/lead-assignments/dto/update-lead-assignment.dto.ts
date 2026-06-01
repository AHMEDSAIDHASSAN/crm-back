import { PartialType } from '@nestjs/swagger';
import { CreateLeadAssignmentDto } from './create-lead-assignment.dto';

export class UpdateLeadAssignmentDto extends PartialType(CreateLeadAssignmentDto) { }
