import { Module } from '@nestjs/common';
import { LeadRotationRulesService } from './lead-rotation-rules.service';
import { LeadRotationRulesController } from './lead-rotation-rules.controller';

@Module({
  controllers: [LeadRotationRulesController],
  providers: [LeadRotationRulesService],
})
export class LeadRotationRulesModule {}
