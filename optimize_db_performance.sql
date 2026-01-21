-- Improve Review and Product Performance
-- Run this script in your Supabase SQL Editor

-- 1. Accelerate Review Lookups
-- This index makes fetching reviews by product_id instant (avoiding Sequential Scan)
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);

-- 2. Accelerate Sorting by Rating (if used)
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- 3. Accelerate Product Lookup by Slug (Critical for new Slug-based logic)
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

-- 4. Accelerate Review Verification checks
CREATE INDEX IF NOT EXISTS idx_reviews_is_verified ON reviews(is_verified);

-- Verification:
-- After running, you can analyze query performance with:
-- EXPLAIN ANALYZE SELECT * FROM reviews WHERE product_id = '...';
