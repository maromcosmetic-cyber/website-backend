-- Remove duplicate reviews from the database
-- This script keeps only one review for each unique combination of product_id, reviewer_name, and comment
-- Run this in Supabase SQL Editor

-- Step 1: Check current state (should show ~100 reviews if duplicated, 50 if clean)
SELECT COUNT(*) as total_reviews FROM reviews;

-- Step 2: See which products have duplicates
SELECT 
    p.name as product_name,
    COUNT(r.id) as review_count
FROM reviews r
JOIN products p ON r.product_id = p.id
GROUP BY p.name
ORDER BY review_count DESC;

-- Step 3: Delete duplicates, keeping the oldest review for each unique combination
DELETE FROM reviews a USING reviews b
WHERE a.id > b.id 
  AND a.product_id = b.product_id 
  AND a.reviewer_name = b.reviewer_name 
  AND a.comment = b.comment;

-- Step 4: Verify the cleanup (should show 10 reviews per product, 50 total)
SELECT 
    p.name as product_name,
    COUNT(r.id) as review_count
FROM reviews r
JOIN products p ON r.product_id = p.id
GROUP BY p.name
ORDER BY p.name;

SELECT COUNT(*) as total_reviews_after_cleanup FROM reviews;

