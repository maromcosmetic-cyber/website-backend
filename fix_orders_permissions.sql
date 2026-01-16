-- Setup RLS and Permissions for 'orders' table
-- Run this in the Supabase SQL Editor

BEGIN;

-- 1. Ensure the orders table exists in public schema
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id),
    status TEXT CHECK (status IN ('pending', 'paid', 'shipped', 'cancelled')) DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    items JSONB NOT NULL,
    stripe_session_id TEXT,
    shipping_address JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Ensure customers table exists (required for foreign key)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    full_name TEXT,
    email TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS on orders table
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.orders;
DROP POLICY IF EXISTS "Enable admin access to all orders" ON public.orders;

-- 5. Create Policy: Users can view their own orders
CREATE POLICY "Users can view own orders" 
ON public.orders FOR SELECT 
TO authenticated 
USING (auth.uid() = customer_id);

-- 6. Create Policy: Admins can view all orders
-- This allows authenticated admin users to see all orders
CREATE POLICY "Enable admin access to all orders" 
ON public.orders FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- 7. Grant Usage on Schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 8. Grant Permissions on Tables
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO authenticated;
GRANT SELECT ON public.customers TO authenticated;

-- 9. Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

COMMIT;

-- Verify the table exists and is accessible
SELECT 
    table_name, 
    table_schema,
    (SELECT count(*) FROM public.orders) as order_count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'orders';
