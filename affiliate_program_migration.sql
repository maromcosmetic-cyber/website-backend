-- ============================================================================
-- AFFILIATE PROGRAM MIGRATION
-- Add affiliate program tables and functionality to existing database
-- ============================================================================

-- Affiliates table - Core affiliate account information
CREATE TABLE affiliates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id), -- Links to Supabase auth
  affiliate_code VARCHAR(50) UNIQUE NOT NULL, -- Unique referral code
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
  commission_rate DECIMAL(5,4) DEFAULT 0.10, -- Default 10%
  
  -- Profile information
  business_name VARCHAR(255),
  website_url VARCHAR(500),
  social_media JSONB, -- {instagram: '@handle', facebook: 'page', etc}
  tax_information JSONB, -- Tax ID, address, etc (encrypted)
  payment_details JSONB, -- Bank account, PayPal, etc (encrypted)
  
  -- Performance metrics (updated via triggers)
  total_clicks INTEGER DEFAULT 0,
  total_sales DECIMAL(12,2) DEFAULT 0,
  total_commissions DECIMAL(12,2) DEFAULT 0,
  pending_commissions DECIMAL(12,2) DEFAULT 0,
  paid_commissions DECIMAL(12,2) DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  last_active TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Affiliate links - Generated referral links with campaign tracking
CREATE TABLE affiliate_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  link_type VARCHAR(20) CHECK (link_type IN ('general', 'product', 'category')),
  target_url TEXT NOT NULL, -- The destination URL
  campaign_name VARCHAR(100), -- Optional campaign identifier
  
  -- Performance tracking
  click_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  revenue_generated DECIMAL(12,2) DEFAULT 0,
  
  -- Status and metadata
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_clicked TIMESTAMP WITH TIME ZONE
);

-- Click tracking - Individual click events
CREATE TABLE affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES affiliates(id),
  affiliate_link_id UUID REFERENCES affiliate_links(id),
  
  -- Request information
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  landing_page TEXT,
  campaign VARCHAR(100),
  
  -- Session tracking
  session_id VARCHAR(100), -- For conversion attribution
  converted BOOLEAN DEFAULT false,
  conversion_order_id UUID REFERENCES orders(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Commission records - Individual commission calculations
CREATE TABLE affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES affiliates(id),
  order_id UUID REFERENCES orders(id),
  click_id UUID REFERENCES affiliate_clicks(id),
  
  -- Commission details
  order_total DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,4) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled', 'disputed')),
  
  -- Payment information
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),
  payment_notes TEXT,
  
  -- Audit trail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES auth.users(id), -- Admin who processed
  updated_by UUID REFERENCES auth.users(id)
);

-- Payout batches - Group commission payments
CREATE TABLE affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES affiliates(id),
  
  -- Payout details
  total_amount DECIMAL(12,2) NOT NULL,
  commission_count INTEGER NOT NULL,
  payout_method VARCHAR(50), -- 'bank_transfer', 'paypal', etc
  
  -- Status and processing
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id),
  
  -- External references
  payment_reference VARCHAR(100),
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Link payout to individual commissions
CREATE TABLE affiliate_payout_commissions (
  payout_id UUID REFERENCES affiliate_payouts(id) ON DELETE CASCADE,
  commission_id UUID REFERENCES affiliate_commissions(id) ON DELETE CASCADE,
  PRIMARY KEY (payout_id, commission_id)
);

-- Add affiliate tracking columns to existing orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES affiliates(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS affiliate_click_id UUID REFERENCES affiliate_clicks(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS affiliate_commission_amount DECIMAL(10,2);

-- ============================================================================
-- AFFILIATE PROGRAM INDEXES
-- ============================================================================

-- Performance indexes
CREATE INDEX idx_affiliates_code ON affiliates(affiliate_code);
CREATE INDEX idx_affiliates_status ON affiliates(status);
CREATE INDEX idx_affiliates_user_id ON affiliates(user_id);
CREATE INDEX idx_affiliate_links_affiliate_id ON affiliate_links(affiliate_id);
CREATE INDEX idx_affiliate_links_active ON affiliate_links(is_active);
CREATE INDEX idx_affiliate_clicks_affiliate_id ON affiliate_clicks(affiliate_id);
CREATE INDEX idx_affiliate_clicks_session_id ON affiliate_clicks(session_id);
CREATE INDEX idx_affiliate_clicks_created_at ON affiliate_clicks(created_at);
CREATE INDEX idx_affiliate_commissions_affiliate_id ON affiliate_commissions(affiliate_id);
CREATE INDEX idx_affiliate_commissions_status ON affiliate_commissions(status);
CREATE INDEX idx_affiliate_commissions_order_id ON affiliate_commissions(order_id);
CREATE INDEX idx_orders_affiliate_id ON orders(affiliate_id);

-- ============================================================================
-- AFFILIATE PROGRAM RLS POLICIES
-- ============================================================================

-- Enable RLS on affiliate tables
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payout_commissions ENABLE ROW LEVEL SECURITY;

-- Affiliate access policies
CREATE POLICY "Affiliates can view own data" ON affiliates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Affiliates can update own profile" ON affiliates FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Affiliates can view own links" ON affiliate_links FOR SELECT USING (
  affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
);
CREATE POLICY "Affiliates can manage own links" ON affiliate_links FOR ALL USING (
  affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
);

CREATE POLICY "Affiliates can view own clicks" ON affiliate_clicks FOR SELECT USING (
  affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
);

CREATE POLICY "Affiliates can view own commissions" ON affiliate_commissions FOR SELECT USING (
  affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
);

CREATE POLICY "Affiliates can view own payouts" ON affiliate_payouts FOR SELECT USING (
  affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
);

-- Public policies for tracking (anonymous users can create clicks)
CREATE POLICY "Anyone can create clicks" ON affiliate_clicks FOR INSERT WITH CHECK (true);

-- Admin policies (TODO: Replace with proper admin role check)
-- For now, these are commented out - you'll need to implement admin role checking
-- CREATE POLICY "Admins can manage all affiliate data" ON affiliates FOR ALL USING (
--   auth.jwt() ->> 'email' LIKE '%@marom.com' OR 
--   auth.jwt() ->> 'role' = 'admin'
-- );

-- ============================================================================
-- AFFILIATE PROGRAM FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update affiliate statistics
CREATE OR REPLACE FUNCTION update_affiliate_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update affiliate statistics when commissions change
  IF TG_TABLE_NAME = 'affiliate_commissions' THEN
    UPDATE affiliates SET
      total_commissions = (
        SELECT COALESCE(SUM(commission_amount), 0)
        FROM affiliate_commissions
        WHERE affiliate_id = NEW.affiliate_id
      ),
      pending_commissions = (
        SELECT COALESCE(SUM(commission_amount), 0)
        FROM affiliate_commissions
        WHERE affiliate_id = NEW.affiliate_id AND status = 'pending'
      ),
      paid_commissions = (
        SELECT COALESCE(SUM(commission_amount), 0)
        FROM affiliate_commissions
        WHERE affiliate_id = NEW.affiliate_id AND status = 'paid'
      ),
      updated_at = NOW()
    WHERE id = NEW.affiliate_id;
  END IF;
  
  -- Update affiliate statistics when clicks change
  IF TG_TABLE_NAME = 'affiliate_clicks' THEN
    UPDATE affiliates SET
      total_clicks = (
        SELECT COUNT(*)
        FROM affiliate_clicks
        WHERE affiliate_id = NEW.affiliate_id
      ),
      last_active = NOW(),
      updated_at = NOW()
    WHERE id = NEW.affiliate_id;
    
    -- Update link statistics
    IF NEW.affiliate_link_id IS NOT NULL THEN
      UPDATE affiliate_links SET
        click_count = (
          SELECT COUNT(*)
          FROM affiliate_clicks
          WHERE affiliate_link_id = NEW.affiliate_link_id
        ),
        last_clicked = NOW()
      WHERE id = NEW.affiliate_link_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_affiliate_stats_commissions
  AFTER INSERT OR UPDATE ON affiliate_commissions
  FOR EACH ROW EXECUTE FUNCTION update_affiliate_stats();

CREATE TRIGGER trigger_update_affiliate_stats_clicks
  AFTER INSERT ON affiliate_clicks
  FOR EACH ROW EXECUTE FUNCTION update_affiliate_stats();

-- Function to generate unique affiliate codes
CREATE OR REPLACE FUNCTION generate_affiliate_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code VARCHAR(50);
  code_exists BOOLEAN;
BEGIN
  -- Generate a unique affiliate code if not provided
  IF NEW.affiliate_code IS NULL OR NEW.affiliate_code = '' THEN
    LOOP
      -- Generate code: first 3 letters of business name + random 4 digits
      new_code := UPPER(LEFT(REGEXP_REPLACE(COALESCE(NEW.business_name, 'AFF'), '[^a-zA-Z]', '', 'g'), 3)) || 
                  LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
      
      -- Check if code already exists
      SELECT EXISTS(SELECT 1 FROM affiliates WHERE affiliate_code = new_code) INTO code_exists;
      
      -- If unique, use it
      IF NOT code_exists THEN
        NEW.affiliate_code := new_code;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for affiliate code generation
CREATE TRIGGER trigger_generate_affiliate_code
  BEFORE INSERT ON affiliates
  FOR EACH ROW EXECUTE FUNCTION generate_affiliate_code();

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Insert a sample affiliate for testing (uncomment if needed)
-- INSERT INTO affiliates (business_name, website_url, status) 
-- VALUES ('Test Affiliate', 'https://example.com', 'active');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables were created successfully
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE tablename LIKE 'affiliate%'
ORDER BY tablename;

-- Check if columns were added to orders table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name LIKE 'affiliate%';

-- Show affiliate-related indexes
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE indexname LIKE 'idx_affiliate%'
ORDER BY tablename, indexname;