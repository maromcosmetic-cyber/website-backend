import { Injectable } from '@nestjs/common';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { EmailService } from '../email/email.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly emailService: EmailService
  ) { }

  async sendNewOrderNotification(order: any) {
    const locale = order.locale || 'en';
    const isHebrew = locale === 'he';
    const currency = order.currency || 'THB';
    const currencySymbol = currency === 'ILS' ? '₪' : '฿';

    let message = '';

    if (isHebrew) {
      message = `✨ *הזמנה חדשה התקבלה!* ✨\n\n` +
        `🆔 מספר הזמנה: ${order.id}\n` +
        `💰 סכום: ${currencySymbol}${order.total_amount?.toLocaleString()}\n` +
        `📧 לקוח: ${order.email}\n` +
        `📦 פריטים: ${order.items?.length || 0}`;
    } else {
      message = `✨ *New Order Received!* ✨\n\n` +
        `🆔 Order ID: ${order.id}\n` +
        `💰 Amount: ${currencySymbol}${order.total_amount?.toLocaleString()}\n` +
        `📧 Customer: ${order.email}\n` +
        `📦 Items: ${order.items?.length || 0}`;
    }

    await this.whatsappService.sendNotification(message);
    await this.emailService.sendOrderNotification(order);
    return { success: true };
  }

  create(createOrderDto: CreateOrderDto) {
    return 'This action adds a new order';
  }

  findAll() {
    return `This action returns all orders`;
  }

  findOne(id: number) {
    return `This action returns a #${id} order`;
  }

  update(id: number, updateOrderDto: UpdateOrderDto) {
    return `This action updates a #${id} order`;
  }

  remove(id: number) {
    return `This action removes a #${id} order`;
  }
}
