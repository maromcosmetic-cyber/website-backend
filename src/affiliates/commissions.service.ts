import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { AffiliateCommission, AffiliatePayout } from './entities/affiliate.entity';

@Injectable()
export class CommissionsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getCommissionsByAffiliate(affiliateId: string, status?: string): Promise<AffiliateCommission[]> {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('affiliate_commissions')
      .select(`
        *,
        order:orders(
          id,
          total_amount,
          status,
          created_at,
          items
        )
      `)
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch commissions: ${error.message}`);
    }

    return data || [];
  }

  async getCommissionById(commissionId: string): Promise<AffiliateCommission> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('affiliate_commissions')
      .select(`
        *,
        affiliate:affiliates(
          id,
          business_name,
          affiliate_code
        ),
        order:orders(
          id,
          total_amount,
          status,
          created_at,
          items
        )
      `)
      .eq('id', commissionId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Commission not found');
    }

    return data;
  }

  async getPendingCommissions(affiliateId?: string): Promise<AffiliateCommission[]> {
    const supabase = this.supabaseService.getAdminClient();

    let query = supabase
      .from('affiliate_commissions')
      .select(`
        *,
        affiliate:affiliates(
          id,
          business_name,
          affiliate_code,
          payment_details
        ),
        order:orders(
          id,
          total_amount,
          status,
          created_at
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (affiliateId) {
      query = query.eq('affiliate_id', affiliateId);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch pending commissions: ${error.message}`);
    }

    return data || [];
  }

  async getAllCommissions(status?: string, affiliateId?: string): Promise<AffiliateCommission[]> {
    const supabase = this.supabaseService.getAdminClient();

    let query = supabase
      .from('affiliate_commissions')
      .select(`
        *,
        affiliate:affiliates(
          id,
          business_name,
          affiliate_code,
          payment_details
        ),
        order:orders(
          id,
          total_amount,
          status,
          created_at
        )
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (affiliateId) {
      query = query.eq('affiliate_id', affiliateId);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch commissions: ${error.message}`);
    }

    return data || [];
  }

  async approveCommission(commissionId: string, adminUserId: string): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();

    const { error } = await supabase
      .from('affiliate_commissions')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString(),
        updated_by: adminUserId
      })
      .eq('id', commissionId);

    if (error) {
      throw new BadRequestException(`Failed to approve commission: ${error.message}`);
    }
  }

  async markCommissionAsPaid(
    commissionId: string,
    paymentMethod: string,
    paymentReference: string,
    adminUserId: string,
    notes?: string
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();

    const { error } = await supabase
      .from('affiliate_commissions')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_method: paymentMethod,
        payment_reference: paymentReference,
        payment_notes: notes,
        updated_at: new Date().toISOString(),
        updated_by: adminUserId
      })
      .eq('id', commissionId);

    if (error) {
      throw new BadRequestException(`Failed to mark commission as paid: ${error.message}`);
    }
  }

  async createPayout(
    affiliateId: string,
    commissionIds: string[],
    payoutMethod: string,
    adminUserId: string
  ): Promise<AffiliatePayout> {
    const supabase = this.supabaseService.getAdminClient();

    try {
      // Verify all commissions belong to the affiliate and are approved
      const { data: commissions, error: commissionsError } = await supabase
        .from('affiliate_commissions')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .eq('status', 'approved')
        .in('id', commissionIds);

      if (commissionsError) {
        throw new BadRequestException(`Failed to fetch commissions: ${commissionsError.message}`);
      }

      if (!commissions || commissions.length !== commissionIds.length) {
        throw new BadRequestException('Some commissions are not valid or not approved');
      }

      // Calculate total amount
      const totalAmount = commissions.reduce((sum, comm) => sum + parseFloat(comm.commission_amount), 0);

      // Create payout record
      const { data: payout, error: payoutError } = await supabase
        .from('affiliate_payouts')
        .insert({
          affiliate_id: affiliateId,
          total_amount: totalAmount,
          commission_count: commissions.length,
          payout_method: payoutMethod,
          status: 'pending',
          processed_by: adminUserId
        })
        .select()
        .single();

      if (payoutError) {
        throw new BadRequestException(`Failed to create payout: ${payoutError.message}`);
      }

      // Link commissions to payout
      const payoutCommissions = commissionIds.map(commissionId => ({
        payout_id: payout.id,
        commission_id: commissionId
      }));

      const { error: linkError } = await supabase
        .from('affiliate_payout_commissions')
        .insert(payoutCommissions);

      if (linkError) {
        throw new BadRequestException(`Failed to link commissions to payout: ${linkError.message}`);
      }

      return payout;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create payout');
    }
  }

  async processPayout(
    payoutId: string,
    paymentReference: string,
    adminUserId: string,
    notes?: string
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();

    try {
      // Update payout status
      const { error: payoutError } = await supabase
        .from('affiliate_payouts')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          payment_reference: paymentReference,
          notes: notes
        })
        .eq('id', payoutId);

      if (payoutError) {
        throw new BadRequestException(`Failed to update payout: ${payoutError.message}`);
      }

      // Get all commissions in this payout
      const { data: payoutCommissions, error: commissionsError } = await supabase
        .from('affiliate_payout_commissions')
        .select('commission_id')
        .eq('payout_id', payoutId);

      if (commissionsError) {
        throw new BadRequestException(`Failed to fetch payout commissions: ${commissionsError.message}`);
      }

      if (payoutCommissions && payoutCommissions.length > 0) {
        const commissionIds = payoutCommissions.map(pc => pc.commission_id);

        // Mark all commissions as paid
        const { error: updateError } = await supabase
          .from('affiliate_commissions')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            payment_reference: paymentReference,
            updated_at: new Date().toISOString(),
            updated_by: adminUserId
          })
          .in('id', commissionIds);

        if (updateError) {
          throw new BadRequestException(`Failed to update commission status: ${updateError.message}`);
        }
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to process payout');
    }
  }

  async getPayoutsByAffiliate(affiliateId: string): Promise<AffiliatePayout[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('affiliate_payouts')
      .select('*')
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(`Failed to fetch payouts: ${error.message}`);
    }

    return data || [];
  }

  async getAllPayouts(): Promise<AffiliatePayout[]> {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('affiliate_payouts')
      .select(`
        *,
        affiliate:affiliates(
          id,
          business_name,
          affiliate_code
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(`Failed to fetch payouts: ${error.message}`);
    }

    return data || [];
  }

  async getPayoutStats() {
    const supabase = this.supabaseService.getAdminClient();

    const { data: payouts } = await supabase
      .from('affiliate_payouts')
      .select('status, total_amount');

    if (!payouts) {
      return {
        total_payouts: 0,
        pending_payouts: 0,
        completed_payouts: 0,
        total_amount: 0,
        pending_amount: 0,
        completed_amount: 0
      };
    }

    const stats = {
      total_payouts: payouts.length,
      pending_payouts: payouts.filter(p => p.status === 'pending').length,
      completed_payouts: payouts.filter(p => p.status === 'completed').length,
      total_amount: payouts.reduce((sum, p) => sum + parseFloat(p.total_amount), 0),
      pending_amount: payouts.filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + parseFloat(p.total_amount), 0),
      completed_amount: payouts.filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + parseFloat(p.total_amount), 0)
    };

    return stats;
  }

  async getCommissionStats(affiliateId?: string, startDate?: string, endDate?: string) {
    const supabase = this.supabaseService.getAdminClient();

    let query = supabase
      .from('affiliate_commissions')
      .select('*');

    if (affiliateId) {
      query = query.eq('affiliate_id', affiliateId);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: commissions } = await query;

    if (!commissions) {
      return {
        total_commissions: 0,
        pending_commissions: 0,
        approved_commissions: 0,
        paid_commissions: 0,
        total_amount: 0,
        pending_amount: 0,
        paid_amount: 0
      };
    }

    const stats = {
      total_commissions: commissions.length,
      pending_commissions: commissions.filter(c => c.status === 'pending').length,
      approved_commissions: commissions.filter(c => c.status === 'approved').length,
      paid_commissions: commissions.filter(c => c.status === 'paid').length,
      total_amount: commissions.reduce((sum, c) => sum + parseFloat(c.commission_amount), 0),
      pending_amount: commissions.filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + parseFloat(c.commission_amount), 0),
      paid_amount: commissions.filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + parseFloat(c.commission_amount), 0)
    };

    return stats;
  }

  // Handle refunds and commission adjustments
  async handleRefund(orderId: string, refundAmount: number, adminUserId: string): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();

    // Find commission for this order
    const { data: commission, error: commissionError } = await supabase
      .from('affiliate_commissions')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (commissionError || !commission) {
      // No commission found for this order
      return;
    }

    // Calculate adjustment amount
    const originalOrderTotal = parseFloat(commission.order_total);
    const adjustmentRatio = refundAmount / originalOrderTotal;
    const commissionAdjustment = parseFloat(commission.commission_amount) * adjustmentRatio;

    if (commission.status === 'paid') {
      // Create a negative commission record for the adjustment
      const { error: adjustmentError } = await supabase
        .from('affiliate_commissions')
        .insert({
          affiliate_id: commission.affiliate_id,
          order_id: orderId,
          order_total: -refundAmount,
          commission_rate: commission.commission_rate,
          commission_amount: -commissionAdjustment,
          status: 'approved',
          created_by: adminUserId,
          updated_by: adminUserId
        });

      if (adjustmentError) {
        throw new BadRequestException(`Failed to create commission adjustment: ${adjustmentError.message}`);
      }
    } else {
      // Adjust the existing commission
      const newCommissionAmount = parseFloat(commission.commission_amount) - commissionAdjustment;
      const newOrderTotal = originalOrderTotal - refundAmount;

      const { error: updateError } = await supabase
        .from('affiliate_commissions')
        .update({
          order_total: newOrderTotal,
          commission_amount: newCommissionAmount,
          updated_at: new Date().toISOString(),
          updated_by: adminUserId
        })
        .eq('id', commission.id);

      if (updateError) {
        throw new BadRequestException(`Failed to adjust commission: ${updateError.message}`);
      }
    }
  }
}