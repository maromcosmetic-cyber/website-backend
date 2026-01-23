-- Add address and phone tracking to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS shipping_address JSONB,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Update RLS to allow users to update their own profile (re-affirming)
DROP POLICY IF EXISTS "Users can update own profile" ON customers;
CREATE POLICY "Users can update own profile" ON customers FOR UPDATE USING (auth.uid() = id);
