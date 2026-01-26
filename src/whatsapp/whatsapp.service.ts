import * as fs from 'fs';
import * as path from 'path';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WhatsappService {
    private readonly logger = new Logger(WhatsappService.name);
    private readonly phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    private readonly accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    private readonly adminNumbers = (process.env.WHATSAPP_ADMIN_NUMBERS || '').split(',').map(n => n.trim());
    private readonly logFile = path.join(process.cwd(), 'whatsapp-logs.txt');

    constructor() {
        if (!this.phoneNumberId || !this.accessToken || this.adminNumbers.length === 0) {
            this.logger.warn('WhatsApp credentials or admin numbers are missing. Notifications will not be sent.');
        }
    }

    private logToFile(message: string) {
        const timestamp = new Date().toISOString();
        const logLine = `[${timestamp}] ${message}\n`;
        try {
            fs.appendFileSync(this.logFile, logLine);
        } catch (err) {
            console.error('Failed to write to WhatsApp log file', err);
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

        // Sanitize body for Template parameter (Meta strict rules: no newlines, char limit)
        // We take the first line and limit to 60 chars.
        // Example input: "New Contact Form Submission:\nName: John..."
        // Result: "New Contact Form Submission"
        const templateParam = body.split('\n')[0].replace(/[:\s]+$/, '').substring(0, 60) || 'New Update';

        // Strategy 1: Universal Delivery via Utility Template (admin_alert_v2)
        try {
            await this.callMetaApi({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: 'template',
                template: {
                    name: 'admin_alert_v2', // Matches user screenshot
                    language: { code: 'en' }, // Changed from en_US to en to match "English"
                    components: [
                        {
                            type: 'body',
                            parameters: [
                                { type: 'text', text: templateParam }
                            ]
                        }
                    ]
                }
            });
            this.logger.log(`WhatsApp notification (Template) sent to ${to}`);
            this.logToFile(`SUCCESS: Template notification sent to ${to}`);
            return;
        } catch (templateError) {
            // Enhanced logging to see the exact reason from Meta
            this.logger.warn(`Template send failed for ${to}. Reason: ${templateError.message}`);
            this.logToFile(`WARNING: Template failed for ${to}: ${templateError.message}`);
            if (templateError.response) {
                this.logger.warn(`Meta API Error Details: ${JSON.stringify(templateError.response)}`);
                this.logToFile(`DETAILS: ${JSON.stringify(templateError.response)}`);
            }
        }

        // Strategy 2: Fallback to Plain Text (24h window only)
        try {
            await this.callMetaApi({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: 'text',
                text: { body: body }
            });
            this.logger.log(`WhatsApp notification (Text Fallback) sent to ${to}`);
            this.logToFile(`SUCCESS: Text Fallback sent to ${to}`);
            return;
        } catch (textError) {
            this.logger.error(`Text message send also failed for ${to}: ${textError.message}`);
            this.logToFile(`ERROR: Text Fallback failed for ${to}: ${textError.message}`);
        }

        // Strategy 3: Ultimate Fallback "Ping" (hello_world)
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
            this.logToFile(`SUCCESS: Ping Fallback sent to ${to}`);
        } catch (pingError) {
            this.logger.error(`Even the Ping failed for ${to}`, pingError);
            this.logToFile(`CRITICAL: All methods failed for ${to}: ${pingError.message}`);
        }
    }
}
