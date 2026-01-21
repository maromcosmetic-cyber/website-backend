-- Diagnostic queries to check RLS policies and test product updates

-- 1. Check what RLS policies exist on the products table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'products';

-- 2. Check if RLS is enabled on products table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'products';

-- 3. Try a test update (replace with an actual product ID from your database)
-- First, let's see what products exist:
SELECT id, name, slug, price FROM products LIMIT 5;

-- 4. After you see a product ID, try updating it manually:
-- UPDATE products SET price = 999 WHERE id = 'YOUR-PRODUCT-ID-HERE';
-- Then check if it worked:
-- SELECT id, name, price FROM products WHERE id = 'YOUR-PRODUCT-ID-HERE';
