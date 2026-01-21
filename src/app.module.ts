import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { BundlesModule } from './bundles/bundles.module';
import { OrdersModule } from './orders/orders.module';
import { LeadsModule } from './leads/leads.module';
import { AiModule } from './ai/ai.module';
import { AffiliatesModule } from './affiliates/affiliates.module';

@Module({
  imports: [ProductsModule, BundlesModule, OrdersModule, LeadsModule, AiModule, AffiliatesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
