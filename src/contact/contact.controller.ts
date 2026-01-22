import { Controller, Post, Body } from '@nestjs/common';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Controller('contact')
export class ContactController {
    constructor(private readonly whatsappService: WhatsappService) { }

    @Post('notify')
    async notifyNewMessage(@Body() body: { name: string; email: string; subject: string; message: string }) {
        const { name, email, subject, message } = body;

        // Format the WhatsApp message
        const whatsappMessage = `📬 *New Contact Form Submission*\n\nDeveloped By: Marom Tech\n\n*Name:* ${name}\n*Email:* ${email}\n*Subject:* ${subject}\n*Message:* ${message.substring(0, 500)}${message.length > 500 ? '...' : ''}`;

        // Send notification
        await this.whatsappService.sendNotification(whatsappMessage);

        return { success: true };
    }
}
