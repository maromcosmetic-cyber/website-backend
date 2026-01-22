export class CreateCouponDto {
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    min_order_amount?: number;
    max_discount_amount?: number;
    is_active?: boolean;
    expires_at?: string;
    usage_limit?: number;
}
