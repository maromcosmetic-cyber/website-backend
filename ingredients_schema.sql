-- Ingredients Table for Supabase
-- Add this to your Supabase SQL editor

-- Create ingredients table
create table if not exists ingredients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  image_url text, -- Supabase storage URL
  description text,
  benefits text,
  "order" int not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table ingredients enable row level security;

-- Public read access
create policy "Ingredients are viewable by everyone" 
  on ingredients for select 
  using (true);

-- Admin write access (you'll need to adjust this based on your auth setup)
create policy "Authenticated users can insert ingredients" 
  on ingredients for insert 
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update ingredients" 
  on ingredients for update 
  using (auth.role() = 'authenticated');

create policy "Authenticated users can delete ingredients" 
  on ingredients for delete 
  using (auth.role() = 'authenticated');

-- Create storage bucket for ingredient images
-- Run this in Supabase Storage section or via SQL:
insert into storage.buckets (id, name, public)
values ('ingredients', 'ingredients', true)
on conflict do nothing;

-- Storage policy for public access
create policy "Ingredient images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'ingredients' );

-- Storage policy for authenticated uploads
create policy "Authenticated users can upload ingredient images"
  on storage.objects for insert
  with check ( bucket_id = 'ingredients' and auth.role() = 'authenticated' );

create policy "Authenticated users can update ingredient images"
  on storage.objects for update
  using ( bucket_id = 'ingredients' and auth.role() = 'authenticated' );

create policy "Authenticated users can delete ingredient images"
  on storage.objects for delete
  using ( bucket_id = 'ingredients' and auth.role() = 'authenticated' );
