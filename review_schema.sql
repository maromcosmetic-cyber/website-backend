-- Create Reviews Table
create table if not exists reviews (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  user_id uuid references auth.users(id), -- Can be null for seeded/guest reviews if we allow them, but goal is verified
  rating int not null check (rating >= 1 and rating <= 5),
  comment text,
  image_url text,
  reviewer_name text, -- verified name from order or user profile
  admin_reply text,
  is_verified boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table reviews enable row level security;

-- Policies

-- 1. Public Read: Everyone can fetch reviews
create policy "Reviews are viewable by everyone" 
  on reviews for select 
  using (true);

-- 2. Insert: Authenticated users only (Application logic will check verification status)
create policy "Authenticated users can insert reviews" 
  on reviews for insert 
  with check (auth.role() = 'authenticated');

-- 3. Update: Admin only (for replies) OR User can edit their own? 
-- Let's allow users to edit their own, and Admins to update (needs Admin role logic, simplified here to service_role or specific UID if needed, but for now we'll stick to 'true' for simplicity in dev or use a policy based on metadata if we had roles).
-- A generic "users can update own" policy:
create policy "Users can update own reviews" 
  on reviews for update 
  using (auth.uid() = user_id);

-- Index for performance
create index idx_reviews_product_id on reviews(product_id);
create index idx_reviews_rating on reviews(rating);
