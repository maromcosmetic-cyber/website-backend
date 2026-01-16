
-- 1. Add ingredient_ids to Products Table (Array of UUIDs references)
alter table products 
add column if not exists ingredient_ids uuid[] default '{}';

-- 2. Enable RLS (Should already be on, but safe to repeat)
alter table ingredients enable row level security;
alter table products enable row level security;

-- 3. Policies for Ingredients
-- Ensure public read access
create policy "Public ingredients are viewable by everyone" 
on ingredients for select using (true);

-- Ensure admin access (or broad access if authentication isn't fully strict yet)
create policy "Enable insert for authenticated users only" 
on ingredients for insert with check (auth.rol() = 'authenticated');

create policy "Enable update for authenticated users only" 
on ingredients for update using (auth.rol() = 'authenticated');

create policy "Enable delete for authenticated users only" 
on ingredients for delete using (auth.rol() = 'authenticated');

-- 4. Policies for Products
-- Ensure we can update the ingredient_ids
create policy "Enable update for products" 
on products for update using (true) with check (true);
