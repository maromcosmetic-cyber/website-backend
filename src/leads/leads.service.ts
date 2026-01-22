import { Injectable } from '@nestjs/common';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@Injectable()
export class LeadsService {
  constructor(private readonly whatsappService: WhatsappService) { }

  async sendNewLeadNotification(email: string) {
    const message = `📬 *New Newsletter Subscriber* 📬\n\n` +
      `📧 Email: ${email}\n` +
      `📅 Date: ${new Date().toLocaleString()}`;

    await this.whatsappService.sendNotification(message);
    return { success: true };
  }

  create(createLeadDto: CreateLeadDto) {
    return 'This action adds a new lead';
  }

  findAll() {
    return `This action returns all leads`;
  }

  findOne(id: number) {
    return `This action returns a #${id} lead`;
  }

  update(id: number, updateLeadDto: UpdateLeadDto) {
    return `This action updates a #${id} lead`;
  }

  remove(id: number) {
    return `This action removes a #${id} lead`;
  }
}
