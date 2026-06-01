import { PartialType } from '@nestjs/swagger';
import { CreateLeadFeedbackDto } from './create-lead-feedback.dto';

export class UpdateLeadFeedbackDto extends PartialType(CreateLeadFeedbackDto) { }
