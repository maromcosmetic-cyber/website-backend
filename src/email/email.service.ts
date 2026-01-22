import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface EmailOptions {
    to: string;
    subject: string;
    text: string;
    html: string;
}

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private cachedTransporter: nodemailer.Transporter | null = null;
    private cachedConfigKey: string = '';
    private supabase: SupabaseClient;

    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            this.logger.error('Supabase credentials missing for EmailService');
            // We don't throw immediately to avoid crashing app start, but sending will fail
        } else {
            this.supabase = createClient(supabaseUrl, serviceRoleKey);
        }
    }

    async sendEmail({ to, subject, text, html }: EmailOptions): Promise<void> {
        if (!this.supabase) {
            throw new Error('Supabase client not initialized in EmailService');
        }

        // 1. Fetch SMTP Settings
        const { data: smtpData, error: smtpError } = await this.supabase
            .from('content_blocks')
            .select('content')
            .eq('section_key', 'smtp_config')
            .single();

        if (smtpError || !smtpData) {
            this.logger.error(`Failed to fetch SMTP settings: ${smtpError?.message}`);
            throw new Error('SMTP Configuration not found.');
        }

        let config;
        try {
            config = JSON.parse(smtpData.content);
        } catch (e) {
            throw new Error('Invalid SMTP Configuration format.');
        }

        if (!config.host || !config.user || !config.pass) {
            throw new Error('Incomplete SMTP Configuration.');
        }

        // Generate a key to identify if config changed
        const configKey = `${config.host}:${config.user}:${config.port}`;

        // 2. Create or Reuse Transporter
        if (!this.cachedTransporter || this.cachedConfigKey !== configKey) {
            this.cachedTransporter = nodemailer.createTransport({
                host: config.host,
                port: Number(config.port) || 587,
                secure: Number(config.port) === 465,
                auth: {
                    user: config.user,
                    pass: config.pass,
                },
                tls: {
                    rejectUnauthorized: false,
                },
                pool: true,
                maxConnections: 5,
                maxMessages: 100,
            });

            this.cachedConfigKey = configKey;
            this.logger.log('Created new SMTP transporter instance');
        }

        // 3. Send Email
        const brandedHtml = this.wrapInTemplate(html);

        await this.cachedTransporter.sendMail({
            from: `"${config.senderName || 'Marom Wellness'}" <${config.fromEmail || config.user}>`,
            to,
            subject,
            text,
            html: brandedHtml,
        });

        this.logger.log(`Email sent to ${to}`);
    }

    private wrapInTemplate(content: string) {
        return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: 'Times New Roman', serif; color: #1F2937; line-height: 1.6; background-color: #FDFBF7; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background-color: #015030; color: #FDB723; padding: 30px; text-align: center; }
            .logo { font-size: 28px; letter-spacing: 0.15em; font-weight: bold; font-family: sans-serif; }
            .content { padding: 40px 30px; }
            .footer { background-color: #F8F5F2; padding: 20px; text-align: center; font-size: 12px; color: #6B7280; letter-spacing: 0.1em; }
            .button { display: inline-block; background-color: #FDB723; color: #015030; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 4px; margin-top: 20px; }
            h1 { color: #015030; margin-top: 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">MAROM</div>
                <div style="font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; margin-top: 5px; opacity: 0.8;">Natural Holistic Products</div>
            </div>
            <div class="content">
                ${content}
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} MAROM COSMETIC<br>Natural Intention</p>
            </div>
        </div>
    </body>
    </html>
    `;
    }
}
