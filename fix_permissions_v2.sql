
-- Setup RLS and Permissions for 'products' table
-- Run this in the Supabase SQL Editor

BEGIN;

-- 1. Ensure the table exists in public schema (it should, but just in case)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    price NUMERIC,
    originalPrice NUMERIC,
    category TEXT,
    description TEXT,
    benefits JSONB,
    ingredients JSONB,
    image TEXT,
    ingredient_ids UUID[] -- The new column
);

-- 2. Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts (clean slate)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;
DROP POLICY IF EXISTS "Enable write access for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.products;

-- 4. Create Policy: Public Read Access (Crucial for Frontend)
CREATE POLICY "Enable read access for all users" 
ON public.products FOR SELECT 
TO public, anon, authenticated 
USING (true);

-- 5. Create Policy: Admin Write Access
-- Assuming authenticated users are admins for this simple app
CREATE POLICY "Enable write access for authenticated users" 
ON public.products FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- 6. Grant Usage on Schema (often missed)
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 7. Grant Select on Table
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO authenticated;

COMMIT;

-- Verify
SELECT count(*) FROM public.products;
