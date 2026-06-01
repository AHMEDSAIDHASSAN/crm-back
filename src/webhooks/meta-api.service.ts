import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';

@Injectable()
export class MetaApiService {
    private readonly logger = new Logger(MetaApiService.name);

    constructor(private prisma: PrismaService) { }

    async getLeadDetails(leadgenId: string) {
        // 1. Get Access Token from settings
        const tokenSetting = await this.prisma.systemSetting.findUnique({
            where: { settingKey: 'META_PAGE_ACCESS_TOKEN' },
        });

        if (!tokenSetting) {
            this.logger.error('META_PAGE_ACCESS_TOKEN not found in system settings');
            return null;
        }

        const accessToken = tokenSetting.settingValue;

        try {
            // Meta Graph API URL for lead details
            const url = `https://graph.facebook.com/v21.0/${leadgenId}?access_token=${accessToken}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                this.logger.error(`Meta API Error: ${data.error.message}`);
                return null;
            }

            // Map field_data to a simple object
            const leadData: any = {};
            if (data.field_data) {
                data.field_data.forEach((field: any) => {
                    leadData[field.name] = field.values[0];
                });
            }

            return {
                firstName: leadData.first_name || leadData.full_name?.split(' ')[0] || 'Meta',
                lastName: leadData.last_name || leadData.full_name?.split(' ').slice(1).join(' ') || 'Lead',
                email: leadData.email,
                phoneNumber: leadData.phone_number,
                adId: data.ad_id,
                formId: data.form_id,
            };
        } catch (error) {
            this.logger.error(`Failed to fetch lead details from Meta: ${error.message}`);
            return null;
        }
    }
}
