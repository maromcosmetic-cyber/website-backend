import { Module } from '@nestjs/common';
import { WoocommerceController } from './woocommerce.controller';
import { WoocommerceService } from './woocommerce.service';
import { WoocommerceSupabaseService } from './woocommerce-supabase.service';
import { WoocommerceAuthGuard } from './woocommerce.guard';

@Module({
    controllers: [WoocommerceController],
    providers: [WoocommerceService, WoocommerceSupabaseService, WoocommerceAuthGuard],
})
export class WoocommerceModule { }
