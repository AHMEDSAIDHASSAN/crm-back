import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../config/prisma.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
    private readonly logger = new Logger(WebhooksController.name);

    constructor(
        private readonly webhooksService: WebhooksService,
        private prisma: PrismaService,
    ) { }

    @Get('meta')
    @ApiOperation({ summary: 'Meta Webhook Verification (Challenge)' })
    async verifyMeta(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') token: string,
        @Query('hub.challenge') challenge: string,
    ) {
        this.logger.log('Meta verification request received');

        const verifyTokenSetting = await this.prisma.systemSetting.findUnique({
            where: { settingKey: 'META_VERIFY_TOKEN' },
        });

        const expectedToken = verifyTokenSetting?.settingValue || 'sira_elite_secret';

        if (mode === 'subscribe' && token === expectedToken) {
            this.logger.log('Meta webhook verified successfully');
            return challenge;
        }

        this.logger.warn('Meta webhook verification failed');
        return 'Verification failed';
    }

    @Post('meta')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Meta Lead Capture Webhook' })
    async handleMeta(@Body() payload: any) {
        // Run async so we return 200 quickly to Meta
        this.webhooksService.handleMetaWebhook(payload).catch(err => {
            this.logger.error(`Error in webhook processing: ${err.message}`);
        });

        return { received: true };
    }
}
