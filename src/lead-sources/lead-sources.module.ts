import { Module } from '@nestjs/common';
import { LeadSourcesService } from './lead-sources.service';
import { LeadSourcesController } from './lead-sources.controller';

@Module({
  controllers: [LeadSourcesController],
  providers: [LeadSourcesService],
})
export class LeadSourcesModule {}
