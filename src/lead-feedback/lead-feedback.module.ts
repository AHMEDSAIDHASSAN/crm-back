import { Module } from '@nestjs/common';
import { LeadFeedbackService } from './lead-feedback.service';
import { LeadFeedbackController } from './lead-feedback.controller';

@Module({
  controllers: [LeadFeedbackController],
  providers: [LeadFeedbackService],
})
export class LeadFeedbackModule {}
