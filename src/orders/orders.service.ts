import { Injectable } from '@nestjs/common';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly whatsappService: WhatsappService) { }

  async sendNewOrderNotification(order: any) {
    const message = `✨ *New Order Received!* ✨\n\n` +
      `🆔 Order ID: ${order.id}\n` +
      `💰 Amount: ฿${order.total_amount?.toLocaleString()}\n` +
      `📧 Customer: ${order.email}\n` +
      `📦 Items: ${order.items?.length || 0}`;

    await this.whatsappService.sendNotification(message);
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
