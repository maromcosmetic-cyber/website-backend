-- Add Hebrew specific columns if they don't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS price_ils NUMERIC;
