import { Module } from '@nestjs/common';
import { LeadUploadsService } from './lead-uploads.service';
import { LeadUploadsController } from './lead-uploads.controller';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  controllers: [LeadUploadsController],
  providers: [LeadUploadsService, RolesGuard],
})
export class LeadUploadsModule {}
