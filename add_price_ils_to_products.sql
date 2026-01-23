-- Add price_ils column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS price_ils NUMERIC;
