import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { WhatsAppWebService } from './whatsapp-web.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('whatsapp-web')
@UseGuards(JwtAuthGuard)
export class WhatsAppWebController {
  constructor(private readonly waService: WhatsAppWebService) {}

  /** GET /whatsapp-web/status — system session state */
  @Get('status')
  getStatus() {
    return this.waService.getState('system');
  }

  /** POST /whatsapp-web/send-test — send a test message via system session */
  @Post('send-test')
  async sendTest(@Body() body: { phone: string; message?: string }) {
    const phone = body.phone?.trim();
    if (!phone) return { success: false, reason: 'phone_required' };
    const msg = body.message?.trim() || `اختبار من نظام SIRA CRM ✅`;
    const state = this.waService.getState('system');
    if (state.status !== 'ready') {
      return { success: false, reason: 'whatsapp_not_ready', status: state.status };
    }
    const { ok, error } = await this.waService.sendMessageWithError('system', phone, msg);
    return { success: ok, phone, status: state.status, ...(error ? { error } : {}) };
  }
}
