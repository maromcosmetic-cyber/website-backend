export interface Affiliate {
  id: string;
  user_id: string;
  affiliate_code: string;
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  commission_rate: number;
  business_name?: string;
  website_url?: string;
  social_media?: any;
  tax_information?: any;
  payment_details?: any;
  total_clicks: number;
  total_sales: number;
  total_commissions: number;
  pending_commissions: number;
  paid_commissions: number;
  created_at: string;
  approved_at?: string;
  last_active?: string;
  updated_at: string;
}

export interface AffiliateLink {
  id: string;
  affiliate_id: string;
  link_type: 'general' | 'product' | 'category';
  target_url: string;
  campaign_name?: string;
  click_count: number;
  conversion_count: number;
  revenue_generated: number;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
  last_clicked?: string;
}

export interface AffiliateClick {
  id: string;
  affiliate_id: string;
  affiliate_link_id?: string;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  landing_page?: string;
  campaign?: string;
  session_id?: string;
  converted: boolean;
  conversion_order_id?: string;
  created_at: string;
}

export interface AffiliateCommission {
  id: string;
  affiliate_id: string;
  order_id: string;
  click_id?: string;
  order_total: number;
  commission_rate: number;
  commission_amount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled' | 'disputed';
  paid_at?: string;
  payment_method?: string;
  payment_reference?: string;
  payment_notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface AffiliatePayout {
  id: string;
  affiliate_id: string;
  total_amount: number;
  commission_count: number;
  payout_method?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processed_at?: string;
  processed_by?: string;
  payment_reference?: string;
  notes?: string;
  created_at: string;
}