import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { AffiliatesService } from './affiliates.service';
import { TrackClickDto } from './dto/track-click.dto';
import { AffiliateClick } from './entities/affiliate.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TrackingService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly affiliatesService: AffiliatesService,
  ) {}

  async trackClick(trackClickDto: TrackClickDto): Promise<{ sessionId: string; success: boolean }> {
    const supabase = this.supabaseService.getClient();

    try {
      // Verify affiliate exists and is active
      const affiliate = await this.affiliatesService.getAffiliateByCode(trackClickDto.affiliateCode);
      if (!affiliate) {
        throw new BadRequestException('Invalid affiliate code');
      }

      // Generate session ID for tracking conversions
      const sessionId = uuidv4();

      // Create click record
      const { data, error } = await supabase
        .from('affiliate_clicks')
        .insert({
          affiliate_id: affiliate.id,
          ip_address: trackClickDto.ipAddress,
          user_agent: trackClickDto.userAgent,
          referrer: trackClickDto.referrer,
          landing_page: trackClickDto.landingPage,
          campaign: trackClickDto.campaign,
          session_id: sessionId,
          converted: false
        })
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`Failed to track click: ${error.message}`);
      }

      return {
        sessionId,
        success: true
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to track affiliate click');
    }
  }

  async trackConversion(sessionId: string, orderId: string): Promise<void> {
    const supabase = this.supabaseService.getClient();

    try {
      // Find the click record by session ID
      const { data: clickData, error: clickError } = await supabase
        .from('affiliate_clicks')
        .select('*')
        .eq('session_id', sessionId)
        .eq('converted', false)
        .single();

      if (clickError || !clickData) {
        // No matching click found - this might be a direct purchase
        return;
      }

      // Update click record to mark as converted
      const { error: updateError } = await supabase
        .from('affiliate_clicks')
        .update({
          converted: true,
          conversion_order_id: orderId
        })
        .eq('id', clickData.id);

      if (updateError) {
        throw new BadRequestException(`Failed to update click conversion: ${updateError.message}`);
      }

      // Get order details to calculate commission
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !orderData) {
        throw new BadRequestException('Order not found');
      }

      // Get affiliate details for commission rate
      const affiliate = await this.affiliatesService.getAffiliateById(clickData.affiliate_id);

      // Calculate commission (excluding shipping)
      const orderTotal = parseFloat(orderData.total_amount);
      const commissionAmount = orderTotal * affiliate.commission_rate;

      // Create commission record
      const { error: commissionError } = await supabase
        .from('affiliate_commissions')
        .insert({
          affiliate_id: clickData.affiliate_id,
          order_id: orderId,
          click_id: clickData.id,
          order_total: orderTotal,
          commission_rate: affiliate.commission_rate,
          commission_amount: commissionAmount,
          status: 'pending'
        });

      if (commissionError) {
        throw new BadRequestException(`Failed to create commission: ${commissionError.message}`);
      }

      // Update order with affiliate information
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          affiliate_id: clickData.affiliate_id,
          affiliate_click_id: clickData.id,
          affiliate_commission_amount: commissionAmount
        })
        .eq('id', orderId);

      if (orderUpdateError) {
        console.error('Failed to update order with affiliate info:', orderUpdateError);
        // Don't throw error here as commission is already created
      }

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to track conversion');
    }
  }

  async getAttributionData(sessionId: string): Promise<AffiliateClick | null> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('affiliate_clicks')
      .select(`
        *,
        affiliate:affiliates(
          id,
          business_name,
          affiliate_code,
          commission_rate
        )
      `)
      .eq('session_id', sessionId)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  async getClicksByAffiliate(affiliateId: string, startDate?: string, endDate?: string): Promise<AffiliateClick[]> {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('affiliate_clicks')
      .select('*')
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch clicks: ${error.message}`);
    }

    return data || [];
  }

  async getConversionsByAffiliate(affiliateId: string, startDate?: string, endDate?: string) {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('affiliate_clicks')
      .select(`
        *,
        order:orders(
          id,
          total_amount,
          status,
          created_at
        )
      `)
      .eq('affiliate_id', affiliateId)
      .eq('converted', true)
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch conversions: ${error.message}`);
    }

    return data || [];
  }

  // Admin methods
  async getAllClicks(startDate?: string, endDate?: string): Promise<AffiliateClick[]> {
    const supabase = this.supabaseService.getAdminClient();

    let query = supabase
      .from('affiliate_clicks')
      .select(`
        *,
        affiliate:affiliates(
          id,
          business_name,
          affiliate_code
        )
      `)
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch clicks: ${error.message}`);
    }

    return data || [];
  }

  async getTrackingStats(startDate?: string, endDate?: string) {
    const supabase = this.supabaseService.getAdminClient();

    // Get total clicks
    let clickQuery = supabase
      .from('affiliate_clicks')
      .select('id, converted, affiliate_id');

    if (startDate) {
      clickQuery = clickQuery.gte('created_at', startDate);
    }
    if (endDate) {
      clickQuery = clickQuery.lte('created_at', endDate);
    }

    const { data: clicks } = await clickQuery;

    // Get commission data
    let commissionQuery = supabase
      .from('affiliate_commissions')
      .select('commission_amount, affiliate_id');

    if (startDate) {
      commissionQuery = commissionQuery.gte('created_at', startDate);
    }
    if (endDate) {
      commissionQuery = commissionQuery.lte('created_at', endDate);
    }

    const { data: commissions } = await commissionQuery;

    // Calculate stats
    const totalClicks = clicks?.length || 0;
    const totalConversions = clicks?.filter(click => click.converted).length || 0;
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
    const totalCommissions = commissions?.reduce((sum, comm) => sum + parseFloat(comm.commission_amount), 0) || 0;

    // Get unique affiliates with activity
    const activeAffiliates = new Set(clicks?.map(click => click.affiliate_id) || []).size;

    return {
      total_clicks: totalClicks,
      total_conversions: totalConversions,
      conversion_rate: conversionRate,
      total_commissions: totalCommissions,
      active_affiliates: activeAffiliates
    };
  }
}