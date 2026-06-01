import { Module } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  controllers: [CampaignsController],
  providers: [CampaignsService, RolesGuard],
})
export class CampaignsModule {}
