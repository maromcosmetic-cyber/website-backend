import { Injectable } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

export interface FraudCheckResult {
  isSuspicious: boolean;
  reasons: string[];
  riskScore: number; // 0-100, higher is more suspicious
}

@Injectable()
export class FraudDetectionService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async checkOrderForFraud(
    orderId: string,
    affiliateId: string,
    customerEmail: string,
    ipAddress?: string
  ): Promise<FraudCheckResult> {
    const reasons: string[] = [];
    let riskScore = 0;

    try {
      const supabase = this.supabaseService.getAdminClient();

      // Get affiliate information
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('*')
        .eq('id', affiliateId)
        .single();

      if (!affiliate) {
        return { isSuspicious: false, reasons: [], riskScore: 0 };
      }

      // Check 1: Self-referral detection
      // Check if customer email matches affiliate's user email
      const { data: affiliateUser } = await supabase
        .from('auth.users')
        .select('email')
        .eq('id', affiliate.user_id)
        .single();

      if (affiliateUser && affiliateUser.email === customerEmail) {
        reasons.push('Self-referral detected: Customer email matches affiliate email');
        riskScore += 50;
      }

      // Check 2: Suspicious click patterns
      // Check for multiple clicks from same IP in short time
      if (ipAddress) {
        const { data: recentClicks } = await supabase
          .from('affiliate_clicks')
          .select('*')
          .eq('affiliate_id', affiliateId)
          .eq('ip_address', ipAddress)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

        if (recentClicks && recentClicks.length > 10) {
          reasons.push(`Suspicious click pattern: ${recentClicks.length} clicks from same IP in 24 hours`);
          riskScore += 30;
        }
      }

      // Check 3: High conversion rate (might indicate fake traffic)
      const { data: clickStats } = await supabase
        .from('affiliate_clicks')
        .select('converted')
        .eq('affiliate_id', affiliateId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

      if (clickStats && clickStats.length > 0) {
        const conversionRate = clickStats.filter(c => c.converted).length / clickStats.length;
        if (conversionRate > 0.5) { // More than 50% conversion rate is suspicious
          reasons.push(`Unusually high conversion rate: ${(conversionRate * 100).toFixed(1)}%`);
          riskScore += 25;
        }
      }

      // Check 4: Rapid successive orders
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

      if (recentOrders && recentOrders.length > 5) {
        reasons.push(`Multiple orders in short timeframe: ${recentOrders.length} orders in last hour`);
        riskScore += 20;
      }

      // Check 5: New affiliate with high-value orders
      const affiliateAge = Date.now() - new Date(affiliate.created_at).getTime();
      const isNewAffiliate = affiliateAge < 7 * 24 * 60 * 60 * 1000; // Less than 7 days old

      if (isNewAffiliate) {
        const { data: orderData } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('id', orderId)
          .single();

        if (orderData && parseFloat(orderData.total_amount) > 5000) { // High-value order
          reasons.push('New affiliate with high-value order');
          riskScore += 15;
        }
      }

      return {
        isSuspicious: riskScore >= 50,
        reasons,
        riskScore: Math.min(riskScore, 100)
      };

    } catch (error) {
      console.error('Error in fraud detection:', error);
      return { isSuspicious: false, reasons: ['Fraud check failed'], riskScore: 0 };
    }
  }

  async flagSuspiciousActivity(
    affiliateId: string,
    orderId: string,
    fraudResult: FraudCheckResult
  ): Promise<void> {
    try {
      const supabase = this.supabaseService.getAdminClient();

      // Log the suspicious activity
      await supabase
        .from('affiliate_fraud_logs')
        .insert({
          affiliate_id: affiliateId,
          order_id: orderId,
          risk_score: fraudResult.riskScore,
          reasons: fraudResult.reasons,
          status: 'flagged',
          created_at: new Date().toISOString()
        });

      // If very suspicious, automatically suspend the affiliate
      if (fraudResult.riskScore >= 80) {
        await supabase
          .from('affiliates')
          .update({
            status: 'suspended',
            updated_at: new Date().toISOString()
          })
          .eq('id', affiliateId);

        console.log(`Affiliate ${affiliateId} automatically suspended due to high fraud risk (${fraudResult.riskScore})`);
      }

      // Mark commission as disputed if suspicious
      if (fraudResult.isSuspicious) {
        await supabase
          .from('affiliate_commissions')
          .update({
            status: 'disputed',
            updated_at: new Date().toISOString()
          })
          .eq('order_id', orderId);
      }

    } catch (error) {
      console.error('Error flagging suspicious activity:', error);
    }
  }

  async getAffiliateRiskProfile(affiliateId: string): Promise<{
    riskLevel: 'low' | 'medium' | 'high';
    totalFlags: number;
    recentFlags: number;
    averageRiskScore: number;
  }> {
    try {
      const supabase = this.supabaseService.getAdminClient();

      const { data: fraudLogs } = await supabase
        .from('affiliate_fraud_logs')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false });

      if (!fraudLogs || fraudLogs.length === 0) {
        return {
          riskLevel: 'low',
          totalFlags: 0,
          recentFlags: 0,
          averageRiskScore: 0
        };
      }

      const totalFlags = fraudLogs.length;
      const recentFlags = fraudLogs.filter(log => 
        new Date(log.created_at).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000 // Last 30 days
      ).length;

      const averageRiskScore = fraudLogs.reduce((sum, log) => sum + log.risk_score, 0) / totalFlags;

      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (averageRiskScore >= 70 || recentFlags >= 5) {
        riskLevel = 'high';
      } else if (averageRiskScore >= 40 || recentFlags >= 2) {
        riskLevel = 'medium';
      }

      return {
        riskLevel,
        totalFlags,
        recentFlags,
        averageRiskScore
      };

    } catch (error) {
      console.error('Error getting affiliate risk profile:', error);
      return {
        riskLevel: 'low',
        totalFlags: 0,
        recentFlags: 0,
        averageRiskScore: 0
      };
    }
  }
}