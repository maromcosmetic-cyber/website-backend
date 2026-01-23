-- Add Hebrew content columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS name_he TEXT,
ADD COLUMN IF NOT EXISTS description_he TEXT,
ADD COLUMN IF NOT EXISTS benefits_he TEXT;

-- Add Hebrew content columns to reviews (if needed, but usually reviews are per user language)
-- However, legal pages might be in a different table or static.

-- Add Hebrew content to content_blocks if exists (for dynamic page content)
ALTER TABLE IF EXISTS content_blocks 
ADD COLUMN IF NOT EXISTS content_he TEXT;
