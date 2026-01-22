import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { EmailService } from '../email/email.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { CreateAffiliateDto } from './dto/create-affiliate.dto';
import { GenerateLinkDto } from './dto/generate-link.dto';
import { Affiliate, AffiliateLink } from './entities/affiliate.entity';

@Injectable()
export class AffiliatesService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly emailService: EmailService,
    private readonly whatsappService: WhatsappService
  ) { }

  async registerAffiliate(createAffiliateDto: CreateAffiliateDto): Promise<{ message: string; affiliate_id?: string }> {
    // ... logic remains same, just constructor change handled by DI
    // Use admin client for registration to bypass RLS and handle user creation
    const supabase = this.supabaseService.getAdminClient();

    try {
      let userId: string;

      // Check if user already exists in customers table (linked to auth.users)
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', createAffiliateDto.email)
        .single();




      if (existingCustomer) {
        userId = existingCustomer.id;
        // Update existing user metadata to include affiliate info
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: {
            business_name: createAffiliateDto.business_name,
            user_type: 'affiliate'
          }
        });
      } else {
        // Create new user account in Supabase Auth using Admin API
        // This avoids sending the default Supabase confirmation email if email_confirm is true
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: createAffiliateDto.email,
          password: this.generateTemporaryPassword(),
          email_confirm: true, // Auto-confirm user to skip default email
          user_metadata: {
            business_name: createAffiliateDto.business_name,
            user_type: 'affiliate'
          }
        });

        if (authError) {
          throw new BadRequestException(`Failed to create affiliate account: ${authError.message}`);
        }

        if (!authData.user) {
          throw new BadRequestException('Failed to create user account');
        }
        userId = authData.user.id;
      }

      // Create affiliate record
      const { data: affiliate, error: affiliateError } = await supabase
        .from('affiliates')
        .insert({
          user_id: userId,
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

      const message = `🤝 *New Affiliate Application* 🤝\n` +
        `Name: ${createAffiliateDto.business_name}\n` +
        `Email: ${createAffiliateDto.email}\n` +
        `Web: ${createAffiliateDto.website_url || 'N/A'}`;

      try {
        await this.whatsappService.sendNotification(message);
      } catch (e) {
        console.error('Failed to send WhatsApp notification', e);
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

    // Send approval email to affiliate
    try {
      // 1. Get affiliate and user details
      const affiliate = await this.getAffiliateById(affiliateId);
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(affiliate.user_id);

      if (userError || !userData.user) {
        console.error('Failed to fetch user for email sending:', userError);
        return; // Don't fail the approval if email fails, but log it
      }

      const userEmail = userData.user.email;

      if (!userEmail) {
        console.error('User has no email');
        return;
      }

      // 2. Generate Password Reset Link (Magic Link)
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: userEmail
      });

      if (linkError) {
        console.error('Failed to generate password reset link:', linkError);
      }

      // 3. Send Email
      // Note: check linkData structure for your supabase version, usually linkData.properties.action_link
      // casting any to avoid rigid type check if types are outdated
      const actionLink = (linkData as any)?.properties?.action_link || (linkData as any)?.action_link;

      await this.emailService.sendEmail({
        to: userEmail,
        subject: 'Welcome to the Team! Your Affiliate Application is Approved',
        text: `Dear ${affiliate.business_name},\n\nCongratulations! Your application to join the MAROM Affiliate Program has been approved.\n\nYou can now log in to your dashboard to access your unique affiliate link and track your commissions.\n\nFirst, please create your password using the link below:\n${actionLink}\n\nLogin URL: https://maromcosmetic.com/affiliate/login\n\nWelcome aboard,\nThe MAROM Team`,
        html: `
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #015030; font-family: 'serif'; font-size: 28px; margin-bottom: 10px;">Application Approved</h1>
                <div style="width: 50px; height: 2px; background-color: #FDB723; margin: 0 auto;"></div>
            </div>
            
            <p>Dear <strong>${affiliate.business_name}</strong>,</p>
            
            <p>We are delighted to welcome you to the <strong>MAROM</strong> family! Your affiliate application has been approved.</p>
            
            <div style="background-color: #F8F5F2; padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #015030;">
                <h3 style="color: #015030; margin-top: 0; font-size: 16px;">Next Step: Access Your Dashboard</h3>
                <p>To get started, please set up your account password. This will give you secure access to your affiliate dashboard where you can find your tracking links and monitor your earnings.</p>
                <div style="text-align: center; margin-top: 25px; margin-bottom: 15px;">
                    <a href="${actionLink}" style="background-color: #015030; color: #FDB723; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">Create My Password</a>
                </div>
                <p style="font-size: 12px; color: #6B7280; text-align: center;">(This link is valid for 24 hours)</p>
            </div>

            <p><strong>Your Dashboard Access:</strong><br>
            <a href="https://maromcosmetic.com/affiliate/login" style="color: #015030;">https://maromcosmetic.com/affiliate/login</a></p>
            
            <p>We look forward to a prosperous partnership!</p>
            
            <p style="margin-top: 40px; font-size: 15px;">Warm Regards,<br><strong style="color: #015030;">The MAROM Team</strong></p>
        `
      });

      console.log(`[Affiliate Approval] Email sent to ${userEmail}`);

    } catch (e) {
      console.error('Error sending approval email:', e);
      // We do not rethrow to avoid reverting the status update
    }
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