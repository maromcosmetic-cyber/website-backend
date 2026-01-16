-- Create missing tables only (skip if they already exist)

-- Enable UUID extension (safe to run multiple times)
create extension if not exists "uuid-ossp";

-- Customers Table (linked to auth.users if using Supabase Auth)
create table if not exists customers (
  id uuid primary key references auth.users(id),
  full_name text,
  email text unique not null,
  stripe_customer_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Orders Table
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references customers(id),
  status text check (status in ('pending', 'paid', 'shipped', 'cancelled')) default 'pending',
  total_amount decimal(10, 2) not null,
  items jsonb not null, -- Snapshot of items purchased
  stripe_session_id text,
  shipping_address jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Bundles (Rituals) Table
create table if not exists bundles (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  description text,
  price decimal(10, 2) not null,
  products uuid[] not null, -- Array of product IDs
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Leads Table (CRM)
create table if not exists leads (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  name text,
  source text,
  interest_tags text[], -- e.g. ["hair", "skin"]
  status text default 'new',
  ai_notes text, -- For Gemini analysis
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Contact Messages Table (CRM)
create table if not exists contact_messages (
  id uuid primary key default uuid_generate_v4(),
  name text,
  email text not null,
  subject text,
  message text,
  status text default 'new',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Content Blocks (for AI to suggest copy)
create table if not exists content_blocks (
  id uuid primary key default uuid_generate_v4(),
  section_key text unique not null, -- e.g. "homepage_hero_title"
  content text not null,
  ai_suggestion text,
  last_updated_by uuid references auth.users(id),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS Policies (Security)
alter table orders enable row level security;
alter table customers enable row level security;
alter table leads enable row level security;
alter table bundles enable row level security;

-- Drop existing policies if they exist (to avoid conflicts)
drop policy if exists "Public bundles are viewable by everyone" on bundles;
drop policy if exists "Users can view own orders" on orders;
drop policy if exists "Users can update own profile" on customers;

-- Public read access for bundles
create policy "Public bundles are viewable by everyone" on bundles for select using (true);

-- Customer access
create policy "Users can view own orders" on orders for select using (auth.uid() = customer_id);
create policy "Users can update own profile" on customers for update using (auth.uid() = id);

-- Allow users to insert their own customer record
create policy "Users can insert own profile" on customers for insert with check (auth.uid() = id);
