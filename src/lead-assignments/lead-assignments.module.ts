import { Module } from '@nestjs/common';
import { LeadAssignmentsService } from './lead-assignments.service';
import { LeadAssignmentsController } from './lead-assignments.controller';

@Module({
  controllers: [LeadAssignmentsController],
  providers: [LeadAssignmentsService],
})
export class LeadAssignmentsModule {}
