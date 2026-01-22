import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { SupabaseService } from '../affiliates/supabase.service';

@Injectable()
export class CouponsService {
    constructor(private readonly supabaseService: SupabaseService) { }

    async create(createCouponDto: CreateCouponDto) {
        const client = this.supabaseService.getAdminClient();
        const { data, error } = await client
            .from('coupons')
            .insert([createCouponDto])
            .select()
            .single();

        if (error) throw new BadRequestException(error.message);
        return data;
    }

    async findAll() {
        const client = this.supabaseService.getClient();
        const { data, error } = await client
            .from('coupons')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw new BadRequestException(error.message);
        return data;
    }

    async findOne(id: string) {
        const client = this.supabaseService.getClient();
        const { data, error } = await client
            .from('coupons')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw new NotFoundException('Coupon not found');
        return data;
    }

    async findByCode(code: string) {
        const client = this.supabaseService.getClient();
        const { data, error } = await client
            .from('coupons')
            .select('*')
            .eq('code', code)
            .eq('is_active', true)
            .single();

        if (error || !data) return null;

        // Check expiration
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
            return null;
        }

        // Check usage limit
        if (data.usage_limit && data.usage_count >= data.usage_limit) {
            return null;
        }

        return data;
    }

    async update(id: string, updateCouponDto: UpdateCouponDto) {
        const client = this.supabaseService.getAdminClient();
        const { data, error } = await client
            .from('coupons')
            .update(updateCouponDto)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new BadRequestException(error.message);
        return data;
    }

    async remove(id: string) {
        const client = this.supabaseService.getAdminClient();
        const { error } = await client
            .from('coupons')
            .delete()
            .eq('id', id);

        if (error) throw new BadRequestException(error.message);
        return { message: 'Coupon deleted successfully' };
    }

    async validate(code: string, cartTotal: number) {
        const coupon = await this.findByCode(code);
        if (!coupon) {
            throw new BadRequestException('Invalid or expired coupon code');
        }

        if (cartTotal < coupon.min_order_amount) {
            throw new BadRequestException(`Minimum order amount of ฿${coupon.min_order_amount} required`);
        }

        let discount = 0;
        if (coupon.discount_type === 'percentage') {
            discount = (cartTotal * coupon.discount_value) / 100;
            if (coupon.max_discount_amount && discount > coupon.max_discount_amount) {
                discount = coupon.max_discount_amount;
            }
        } else {
            discount = coupon.discount_value;
        }

        return {
            valid: true,
            discount,
            code: coupon.code,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value
        };
    }
}
