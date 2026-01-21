import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { CreateAffiliateDto } from './dto/create-affiliate.dto';
import { GenerateLinkDto } from './dto/generate-link.dto';
import { Affiliate, AffiliateLink } from './entities/affiliate.entity';

@Injectable()
export class AffiliatesService {
  constructor(private readonly supabaseService: SupabaseService) { }

  async registerAffiliate(createAffiliateDto: CreateAffiliateDto): Promise<{ message: string; affiliate_id?: string }> {
    // Use admin client for registration to bypass RLS and handle user creation
    const supabase = this.supabaseService.getAdminClient();

    try {
      // First, create a user account in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: createAffiliateDto.email,
        password: this.generateTemporaryPassword(),
        options: {
          data: {
            business_name: createAffiliateDto.business_name,
            user_type: 'affiliate'
          }
        }
      });

      if (authError) {
        throw new BadRequestException(`Failed to create affiliate account: ${authError.message}`);
      }

      if (!authData.user) {
        throw new BadRequestException('Failed to create user account');
      }

      // Create affiliate record
      const { data: affiliate, error: affiliateError } = await supabase
        .from('affiliates')
        .insert({
          user_id: authData.user.id,
          business_name: createAffiliateDto.business_name,
          website_url: createAffiliateDto.website_url,
          description: createAffiliateDto.description,
          social_media: createAffiliateDto.social_media,
          tax_information: createAffiliateDto.tax_information,
          payment_details: createAffiliateDto.payment_details,
          status: 'pending'
        })
        .select()
        .single();

      if (affiliateError) {
        throw new BadRequestException(`Failed to create affiliate record: ${affiliateError.message}`);
      }

      return {
        message: 'Affiliate application submitted successfully. You will receive an email once approved.',
        affiliate_id: affiliate.id
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Registration error detail:', error);
      throw new BadRequestException(`Failed to register affiliate: ${error.message || 'Unknown error'}`);
    }
  }

  async getAffiliateByCode(affiliateCode: string): Promise<Affiliate | null> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('affiliates')
      .select('*')
      .eq('affiliate_code', affiliateCode)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  async getAffiliateById(affiliateId: string): Promise<Affiliate> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('affiliates')
      .select('*')
      .eq('id', affiliateId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Affiliate not found');
    }

    return data;
  }

  async getAffiliateByUserId(userId: string): Promise<Affiliate> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Affiliate not found');
    }

    return data;
  }

  async generateAffiliateLink(affiliateId: string, generateLinkDto: GenerateLinkDto): Promise<AffiliateLink> {
    const supabase = this.supabaseService.getClient();

    // Verify affiliate exists and is active
    const affiliate = await this.getAffiliateById(affiliateId);
    if (affiliate.status !== 'active') {
      throw new BadRequestException('Affiliate account is not active');
    }

    const { data, error } = await supabase
      .from('affiliate_links')
      .insert({
        affiliate_id: affiliateId,
        link_type: generateLinkDto.link_type,
        target_url: generateLinkDto.target_url,
        campaign_name: generateLinkDto.campaign_name,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to generate link: ${error.message}`);
    }

    return data;
  }

  async getAffiliateLinks(affiliateId: string): Promise<AffiliateLink[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('affiliate_links')
      .select('*')
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(`Failed to fetch links: ${error.message}`);
    }

    return data || [];
  }

  async getAffiliateStats(affiliateId: string, startDate?: string, endDate?: string) {
    const supabase = this.supabaseService.getClient();

    // Get basic affiliate info
    const affiliate = await this.getAffiliateById(affiliateId);

    // Get click stats
    let clickQuery = supabase
      .from('affiliate_clicks')
      .select('*')
      .eq('affiliate_id', affiliateId);

    if (startDate) {
      clickQuery = clickQuery.gte('created_at', startDate);
    }
    if (endDate) {
      clickQuery = clickQuery.lte('created_at', endDate);
    }

    const { data: clicks } = await clickQuery;

    // Get commission stats
    let commissionQuery = supabase
      .from('affiliate_commissions')
      .select('*')
      .eq('affiliate_id', affiliateId);

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
    const pendingCommissions = commissions?.filter(comm => comm.status === 'pending')
      .reduce((sum, comm) => sum + parseFloat(comm.commission_amount), 0) || 0;
    const paidCommissions = commissions?.filter(comm => comm.status === 'paid')
      .reduce((sum, comm) => sum + parseFloat(comm.commission_amount), 0) || 0;

    return {
      affiliate: {
        id: affiliate.id,
        business_name: affiliate.business_name,
        affiliate_code: affiliate.affiliate_code,
        status: affiliate.status,
        commission_rate: affiliate.commission_rate,
        created_at: affiliate.created_at
      },
      stats: {
        total_clicks: totalClicks,
        total_conversions: totalConversions,
        conversion_rate: conversionRate,
        total_commissions: totalCommissions,
        pending_commissions: pendingCommissions,
        paid_commissions: paidCommissions
      },
      recent_clicks: clicks?.slice(0, 10) || [],
      recent_commissions: commissions?.slice(0, 10) || []
    };
  }

  // Admin methods
  async getAllAffiliates(status?: string): Promise<Affiliate[]> {
    const supabase = this.supabaseService.getAdminClient();

    let query = supabase
      .from('affiliates')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch affiliates: ${error.message}`);
    }

    return data || [];
  }

  async getProgramStats() {
    const supabase = this.supabaseService.getAdminClient();

    // Get affiliate counts by status
    const { data: affiliates } = await supabase
      .from('affiliates')
      .select('status, total_sales, total_commissions, pending_commissions, paid_commissions');

    const stats = {
      total_affiliates: affiliates?.length || 0,
      active_affiliates: affiliates?.filter(a => a.status === 'active').length || 0,
      pending_affiliates: affiliates?.filter(a => a.status === 'pending').length || 0,
      total_sales: affiliates?.reduce((sum, a) => sum + (parseFloat(a.total_sales) || 0), 0) || 0,
      total_commissions: affiliates?.reduce((sum, a) => sum + (parseFloat(a.total_commissions) || 0), 0) || 0,
      pending_commissions: affiliates?.reduce((sum, a) => sum + (parseFloat(a.pending_commissions) || 0), 0) || 0,
      paid_commissions: affiliates?.reduce((sum, a) => sum + (parseFloat(a.paid_commissions) || 0), 0) || 0
    };

    return stats;
  }

  async approveAffiliate(affiliateId: string, adminUserId: string): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();

    const { error } = await supabase
      .from('affiliates')
      .update({
        status: 'active',
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', affiliateId);

    if (error) {
      throw new BadRequestException(`Failed to approve affiliate: ${error.message}`);
    }

    // TODO: Send approval email to affiliate
  }

  async suspendAffiliate(affiliateId: string, adminUserId: string): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();

    const { error } = await supabase
      .from('affiliates')
      .update({
        status: 'suspended',
        updated_at: new Date().toISOString()
      })
      .eq('id', affiliateId);

    if (error) {
      throw new BadRequestException(`Failed to suspend affiliate: ${error.message}`);
    }
  }

  async updateCommissionRate(affiliateId: string, newRate: number, adminUserId: string): Promise<void> {
    if (newRate < 0 || newRate > 1) {
      throw new BadRequestException('Commission rate must be between 0 and 1');
    }

    const supabase = this.supabaseService.getAdminClient();

    const { error } = await supabase
      .from('affiliates')
      .update({
        commission_rate: newRate,
        updated_at: new Date().toISOString()
      })
      .eq('id', affiliateId);

    if (error) {
      throw new BadRequestException(`Failed to update commission rate: ${error.message}`);
    }
  }

  private generateTemporaryPassword(): string {
    // Generate a secure temporary password
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}