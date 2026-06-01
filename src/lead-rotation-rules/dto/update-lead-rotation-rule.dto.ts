import { PartialType } from '@nestjs/swagger';
import { CreateLeadRotationRuleDto } from './create-lead-rotation-rule.dto';

export class UpdateLeadRotationRuleDto extends PartialType(CreateLeadRotationRuleDto) { }
