import { Module } from '@nestjs/common';
import { UnitPreviewsService } from './unit-previews.service';
import { UnitPreviewsController } from './unit-previews.controller';
import { RolesGuard } from '../auth/guards/roles.guard';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [UnitPreviewsController],
  providers: [UnitPreviewsService, RolesGuard],
})
export class UnitPreviewsModule {}
