-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Products Table
create table products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  description text,
  price decimal(10, 2) not null,
  benefits jsonb,
  ingredients jsonb,
  model_url text, -- Path to 3D GLTF/GLB
  texture_url text,
  metadata jsonb,
  stock_quantity int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Bundles (Rituals) Table
create table bundles (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  description text,
  price decimal(10, 2) not null,
  products uuid[] not null, -- Array of product IDs
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Customers Table (linked to auth.users if using Supabase Auth)
create table customers (
  id uuid primary key references auth.users(id),
  full_name text,
  email text unique not null,
  stripe_customer_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Orders Table
create table orders (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references customers(id),
  status text check (status in ('pending', 'paid', 'shipped', 'cancelled')) default 'pending',
  total_amount decimal(10, 2) not null,
  items jsonb not null, -- Snapshot of items purchased
  stripe_session_id text,
  shipping_address jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Leads Table (CRM)
create table leads (
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
create table contact_messages (
  id uuid primary key default uuid_generate_v4(),
  name text,
  email text not null,
  subject text,
  message text,
  status text default 'new',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Content Blocks (for AI to suggest copy)
create table content_blocks (
  id uuid primary key default uuid_generate_v4(),
  section_key text unique not null, -- e.g. "homepage_hero_title"
  content text not null,
  ai_suggestion text,
  last_updated_by uuid references auth.users(id),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS Policies (Security)
alter table products enable row level security;
alter table bundles enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table leads enable row level security;

-- Public read access for products/bundles
create policy "Public products are viewable by everyone" on products for select using (true);
create policy "Public bundles are viewable by everyone" on bundles for select using (true);

-- Customer access
create policy "Users can view own orders" on orders for select using (auth.uid() = customer_id);
create policy "Users can update own profile" on customers for update using (auth.uid() = id);

-- Admin access (Simplified for now - assumes a role or specific email)
-- Ideally use a custom claim or "admins" table.
