import { Injectable, Logger } from '@nestjs/common';
import { MetaApiService } from './meta-api.service';
import { LeadsService } from '../leads/leads.service';
import { PrismaService } from '../config/prisma.service';

@Injectable()
export class WebhooksService {
    private readonly logger = new Logger(WebhooksService.name);

    constructor(
        private metaApi: MetaApiService,
        private leadsService: LeadsService,
        private prisma: PrismaService,
    ) { }

    async handleMetaWebhook(payload: any) {
        this.logger.log('Processing Meta Webhook payload');

        // Meta sends an array of changes
        const entries = payload.entry || [];
        for (const entry of entries) {
            const changes = entry.changes || [];
            for (const change of changes) {
                if (change.field === 'leadgen') {
                    const { leadgen_id, ad_id, form_id } = change.value;

                    this.logger.log(`New lead signal received: ${leadgen_id}`);

                    // 1. Fetch full lead details from Meta
                    const metaLead = await this.metaApi.getLeadDetails(leadgen_id);
                    if (!metaLead) continue;

                    // 2. Find matching campaign by external ID (form_id or ad_id logic)
                    // For now, we use form_id as the external ID mapping
                    const campaign = await this.prisma.campaign.findFirst({
                        where: { campaignIdExternal: form_id },
                    });

                    // 3. Create lead in CRM
                    await this.leadsService.create({
                        firstName: metaLead.firstName,
                        lastName: metaLead.lastName,
                        email: metaLead.email,
                        phone: metaLead.phoneNumber || '',
                        leadSourceId: campaign?.leadSourceId || 1, // Default to 1 if no source
                        campaignId: campaign ? Number(campaign.id) : null,
                        status: 'new_lead',
                        notes: `Meta Ad ID: ${ad_id}`,
                    });

                    this.logger.log(`Successfully imported Meta lead: ${metaLead.email}`);
                }
            }
        }
    }
}
