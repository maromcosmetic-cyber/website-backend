import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ProductsModule } from './products/products.module';
import { BundlesModule } from './bundles/bundles.module';
import { OrdersModule } from './orders/orders.module';
import { LeadsModule } from './leads/leads.module';
import { AiModule } from './ai/ai.module';
import { AffiliatesModule } from './affiliates/affiliates.module';
import { CouponsModule } from './coupons/coupons.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { ContactModule } from './contact/contact.module';
import { EmailModule } from './email/email.module';
import { WoocommerceModule } from './woocommerce/woocommerce.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ProductsModule,
    BundlesModule,
    OrdersModule,
    LeadsModule,
    AiModule,
    AffiliatesModule,
    CouponsModule,
    CouponsModule,
    WhatsappModule,
    ContactModule,
    EmailModule,
    WoocommerceModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
