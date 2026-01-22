import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WhatsappService {
    private readonly logger = new Logger(WhatsappService.name);
    private readonly phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    private readonly accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    private readonly adminNumbers = (process.env.WHATSAPP_ADMIN_NUMBERS || '').split(',').map(n => n.trim());

    constructor() {
        if (!this.phoneNumberId || !this.accessToken || this.adminNumbers.length === 0) {
            this.logger.warn('WhatsApp credentials or admin numbers are missing. Notifications will not be sent.');
        }
    }

    async sendNotification(message: string): Promise<void> {
        if (!this.phoneNumberId || !this.accessToken) return;

        // Send to all admins in parallel to reduce latency
        const promises = this.adminNumbers
            .filter(to => !!to)
            .map(async (to) => {
                try {
                    await this.sendMessage(to, message);
                } catch (error) {
                    this.logger.error(`Failed to send WhatsApp message to ${to}`, error);
                }
            });

        await Promise.all(promises);
    }

    // Helper to perform the fetch request
    private async callMetaApi(payload: any): Promise<any> {
        const url = `https://graph.facebook.com/v17.0/${this.phoneNumberId}/messages`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || 'Unknown WhatsApp API error');
        }
        return data;
    }

    private async sendMessage(to: string, body: string): Promise<void> {

        // Strategy 1: Universal Delivery via Utility Template (admin_alert_v2)
        // This works even if the 24-hour window is closed.
        try {
            await this.callMetaApi({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: 'template',
                template: {
                    name: 'admin_alert_v2',
                    language: { code: 'en_US' },
                    components: [
                        {
                            type: 'body',
                            parameters: [
                                { type: 'text', text: body }
                            ]
                        }
                    ]
                }
            });
            this.logger.log(`WhatsApp notification (Template) sent to ${to}`);
            return;
        } catch (templateError) {
            this.logger.warn(`Template send failed for ${to} (${templateError.message}), falling back to text message.`);
        }

        // Strategy 2: Fallback to Plain Text
        // Only works if the admin has messaged the bot recently (24-hour window).
        try {
            await this.callMetaApi({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: 'text',
                text: { body: body }
            });
            this.logger.log(`WhatsApp notification (Text Fallback) sent to ${to}`);
            return;
        } catch (textError) {
            this.logger.error(`Text message send also failed for ${to}`, textError);
        }

        // Strategy 3: Ultimate Fallback "Ping" (hello_world)
        // If everything else fails, send the generic "hello_world" which is always approved.
        // This alerts the admin to check the dashboard manually.
        try {
            await this.callMetaApi({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: 'template',
                template: {
                    name: 'hello_world',
                    language: { code: 'en_US' }
                }
            });
            this.logger.log(`WhatsApp notification (Ping Fallback) sent to ${to}`);
        } catch (pingError) {
            this.logger.error(`Even the Ping failed for ${to}`, pingError);
        }
    }
}
