import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { MetaApiService } from './meta-api.service';
import { LeadsModule } from '../leads/leads.module';

@Module({
    imports: [LeadsModule],
    controllers: [WebhooksController],
    providers: [WebhooksService, MetaApiService],
})
export class WebhooksModule { }
