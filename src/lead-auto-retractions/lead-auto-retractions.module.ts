import { Module } from '@nestjs/common';
import { LeadAutoRetractionsService } from './lead-auto-retractions.service';
import { LeadAutoRetractionsController } from './lead-auto-retractions.controller';

@Module({
  controllers: [LeadAutoRetractionsController],
  providers: [LeadAutoRetractionsService],
})
export class LeadAutoRetractionsModule {}
