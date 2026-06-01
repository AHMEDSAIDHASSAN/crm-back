import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { WhatsAppWebModule } from '../whatsapp-web/whatsapp-web.module';

@Module({
  imports: [NotificationsModule, WhatsAppWebModule],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule { }
