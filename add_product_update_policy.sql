-- Add RLS policy to allow product updates
-- This allows updates to the products table
-- For production, you should restrict this to authenticated admin users only

-- Option 1: Allow all updates (TEMPORARY - for testing)
-- Uncomment this if you want to test immediately:
-- create policy "Allow product updates" on products for update using (true);

-- Option 2: Allow updates only for authenticated users (RECOMMENDED)
-- First, make sure you're logged in to Supabase in your admin panel
create policy "Authenticated users can update products" on products 
  for update 
  using (auth.role() = 'authenticated');

-- Option 3: Allow updates only for specific admin emails (MOST SECURE)
-- Replace 'your-admin@email.com' with your actual admin email
-- create policy "Admin can update products" on products 
--   for update 
--   using (auth.jwt() ->> 'email' = 'your-admin@email.com');

-- Also add INSERT and DELETE policies for complete admin functionality
create policy "Authenticated users can insert products" on products 
  for insert 
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can delete products" on products 
  for delete 
  using (auth.role() = 'authenticated');
