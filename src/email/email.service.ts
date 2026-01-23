import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);

    constructor() { }

    private async getTransporter() {
        // 1. Fetch SMTP settings from DB (content_blocks)
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            this.logger.error('Supabase credentials missing.');
            return null;
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data } = await supabase
            .from('content_blocks')
            .select('content')
            .eq('section_key', 'smtp_config')
            .single();

        if (!data?.content) {
            this.logger.warn('No SMTP settings found in content_blocks (key: smtp_config).');
            return null;
        }

        try {
            const config = JSON.parse(data.content);
            if (!config.host || !config.user || !config.pass) {
                this.logger.warn('SMTP config found but missing required fields (host, user, pass).');
                return null;
            }

            // 2. Create Nodemailer transporter
            const transporter = nodemailer.createTransport({
                host: config.host,
                port: Number(config.port) || 587,
                secure: Number(config.port) === 465, // true for 465, false for other ports
                auth: {
                    user: config.user,
                    pass: config.pass,
                },
            });

            return { transporter, config };
        } catch (err) {
            this.logger.error('Failed to parse SMTP config from DB', err);
            return null;
        }
    }

    async sendOrderNotification(order: any) {
        const result = await this.getTransporter();
        if (!result) return;
        const { transporter, config } = result;

        const locale = order.locale || 'en';
        const isHebrew = locale === 'he';
        const currency = order.currency || 'THB';
        const currencySymbol = currency === 'ILS' ? '₪' : '฿';

        // Templates
        const subjects = {
            en: {
                admin: `New Order #${order.id.slice(0, 8)} - ${currencySymbol}${order.total_amount}`,
                customer: `Order Confirmation #${order.id.slice(0, 8)} - Marom Cosmetics`
            },
            he: {
                admin: `הזמנה חדשה #${order.id.slice(0, 8)} - ${currencySymbol}${order.total_amount}`,
                customer: `אישור הזמנה #${order.id.slice(0, 8)} - מרום קוסמטיקה`
            }
        };

        const templates = {
            en: `
                <h1>Thank you for your order!</h1>
                <p>Hi there,</p>
                <p>We have received your order and are processing it.</p>
                <hr />
                <h3>Order Details:</h3>
                <ul>
                    <li><strong>Order ID:</strong> ${order.id}</li>
                    <li><strong>Amount:</strong> ${currencySymbol}${order.total_amount?.toLocaleString()}</li>
                </ul>
                <h3>Items:</h3>
                <ul>
                    ${order.items?.map((item: any) => `<li>${item.quantity}x ${item.name}</li>`).join('')}
                </ul>
                <p>We will notify you when your items ship.</p>
            `,
            he: `
                <div dir="rtl" style="text-align: right;">
                    <h1>תודה על הזמנתך!</h1>
                    <p>שלום,</p>
                    <p>קיבלנו את ההזמנה שלך ואנו מטפלים בה כעת.</p>
                    <hr />
                    <h3>פרטי ההזמנה:</h3>
                    <ul>
                        <li><strong>מספר הזמנה:</strong> ${order.id}</li>
                        <li><strong>סכום לתשלום:</strong> ${currencySymbol}${order.total_amount?.toLocaleString()}</li>
                    </ul>
                    <h3>פריטים:</h3>
                    <ul>
                        ${order.items?.map((item: any) => `<li>${item.quantity}x ${item.name}</li>`).join('')}
                    </ul>
                    <p>אנו נודיע לך כאשר הפריטים יצאו למשלוח.</p>
                </div>
            `
        };

        try {
            // Prepare email promises
            const emailPromises = [];

            // 3. Admin Notification (Always English or Hebrew? Let's use English for Admin for now, or maybe based on order locale? Let's stick to English for Admin unless requested otherwise, but user said "admin mail wasnt save" implying checking. I'll keep Admin in English for consistency or maybe add Hebrew if locale is HE. Let's use English for Admin for global team.)
            emailPromises.push(
                transporter.sendMail({
                    from: `"Marom Cosmetics" <${config.user}>`,
                    to: 'maromcosmetic@gmail.com',
                    subject: subjects.en.admin,
                    html: `
                        <h1>New Order Received!</h1>
                        <p>You have received a new order from <strong>${order.email}</strong>.</p>
                        <p><strong>Locale:</strong> ${locale}</p>
                        <hr />
                        <h3>Order Details:</h3>
                        <ul>
                            <li><strong>Order ID:</strong> ${order.id}</li>
                            <li><strong>Amount:</strong> ${currencySymbol}${order.total_amount?.toLocaleString()}</li>
                            <li><strong>Status:</strong> ${order.status}</li>
                        </ul>
                        <h3>Items:</h3>
                        <ul>
                            ${order.items?.map((item: any) => `<li>${item.quantity}x ${item.name}</li>`).join('')}
                        </ul>
                    `
                }).then(info => this.logger.log(`Admin notification sent: ${info.messageId}`))
            );

            // 4. Customer Confirmation
            if (order.email) {
                const customerSubject = isHebrew ? subjects.he.customer : subjects.en.customer;
                const customerHtml = isHebrew ? templates.he : templates.en;

                emailPromises.push(
                    transporter.sendMail({
                        from: `"Marom Cosmetics" <${config.user}>`,
                        to: order.email,
                        subject: customerSubject,
                        html: customerHtml
                    }).then(info => this.logger.log(`Customer confirmation sent to ${order.email}: ${info.messageId}`))
                );
            }

            // Execute in parallel
            await Promise.all(emailPromises);

            this.logger.log(`Admin notification sent for order ${order.id}`);
        } catch (err) {
            this.logger.error('Error sending email:', err);
        }
    }

    async sendEmail(options: { to: string; subject: string; html: string; text?: string }) {
        const result = await this.getTransporter();
        if (!result) return;
        const { transporter, config } = result;

        try {
            const info = await transporter.sendMail({
                from: `"Marom Cosmetics" <${config.user}>`,
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text
            });
            this.logger.log(`Generic email sent: ${info.messageId}`);
        } catch (err) {
            this.logger.error('Error sending generic email:', err);
        }
    }
}
