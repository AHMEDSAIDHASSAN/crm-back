import { Module } from '@nestjs/common';
import { WhatsAppWebService } from './whatsapp-web.service';
import { WhatsAppWebGateway } from './whatsapp-web.gateway';
import { WhatsAppWebController } from './whatsapp-web.controller';

@Module({
  controllers: [WhatsAppWebController],
  providers: [WhatsAppWebService, WhatsAppWebGateway],
  exports: [WhatsAppWebService],
})
export class WhatsAppWebModule {}
