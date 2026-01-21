-- Consolidated Review System Setup
-- 1. Create Table (Schema)
create table if not exists reviews (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  user_id uuid references auth.users(id),
  rating int not null check (rating >= 1 and rating <= 5),
  comment text,
  image_url text,
  reviewer_name text,
  admin_reply text,
  is_verified boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable RLS
alter table reviews enable row level security;

-- 3. Create Policies (Drop first to avoid errors if re-running)
drop policy if exists "Reviews are viewable by everyone" on reviews;
create policy "Reviews are viewable by everyone" on reviews for select using (true);

drop policy if exists "Authenticated users can insert reviews" on reviews;
create policy "Authenticated users can insert reviews" on reviews for insert with check (auth.role() = 'authenticated');

drop policy if exists "Users can update own reviews" on reviews;
create policy "Users can update own reviews" on reviews for update using (auth.uid() = user_id);

-- 4. Create Indexes
create index if not exists idx_reviews_product_id on reviews(product_id);
create index if not exists idx_reviews_rating on reviews(rating);

-- 5. Seed Data (with Images)
do $$
declare
  p_id uuid;
begin

-- 1. Moringa Hair Care Gift Set
select id into p_id from products where slug = 'moringa-hair-care-gift-set';
if p_id is not null then
  insert into reviews (product_id, rating, reviewer_name, comment, image_url, is_verified, created_at) values
  (p_id, 5, 'Sarah L.', 'Absolutely changed my hair care routine. The complete set is pure magic!', 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', true, now() - interval '2 days'),
  (p_id, 5, 'Emily R.', 'Best investment for my hair. The serum is lightweight and the shampoo feels so premium.', null, true, now() - interval '5 days'),
  (p_id, 5, 'Jessica M.', 'I love the smell and how soft my hair feels after just one wash.', 'https://images.unsplash.com/photo-1519699047748-dde82a863817?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', true, now() - interval '1 week'),
  (p_id, 5, 'Amanda K.', 'My hair fall has significantly reduced. Highly recommend the ritual!', null, true, now() - interval '2 weeks'),
  (p_id, 5, 'Michelle T.', 'The packaging is beautiful and the products are even better. 10/10.', 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', true, now() - interval '3 weeks'),
  (p_id, 5, 'Laura B.', 'Finally a natural product that actually works. My scalp feels so healthy.', null, true, now() - interval '1 month'),
  (p_id, 5, 'Rachel W.', 'Bought this as a gift for my sister and she loves it. I had to get one for myself!', null, true, now() - interval '1 month'),
  (p_id, 5, 'Sophia G.', 'The conditioner is so creamy and the serum adds such a nice shine.', 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', true, now() - interval '2 months'),
  (p_id, 5, 'Olivia P.', 'Worth every penny. My hair has never looked this good.', null, true, now() - interval '2 months'),
  (p_id, 5, 'Isabella H.', 'The scent is spa-like and relaxing. A true ritual indeed.', null, true, now() - interval '3 months');
end if;

-- 2. Moringa & Reishi Hair Serum
select id into p_id from products where slug = 'moringa-reishi-hair-serum';
if p_id is not null then
  insert into reviews (product_id, rating, reviewer_name, comment, image_url, is_verified, created_at) values
  (p_id, 5, 'Chloe D.', 'Not greasy at all! Absorbs quickly and smells divine.', 'https://images.unsplash.com/photo-1608248597279-f99d160bfbc8?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', true, now() - interval '1 day'),
  (p_id, 5, 'Megan F.', 'My frizz is gone. This serum is a lifesaver in humidity.', null, true, now() - interval '3 days'),
  (p_id, 5, 'Hannah S.', 'I use it every night on my scalp. Seeing baby hairs growing!', 'https://images.unsplash.com/photo-1544367563-12123d8965cd?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', true, now() - interval '6 days'),
  (p_id, 5, 'Ashley J.', 'A little goes a long way. The bottle lasts forever.', null, true, now() - interval '1 week'),
  (p_id, 5, 'Nicole K.', 'Love the pipette applicator. Very precise.', null, true, now() - interval '2 weeks'),
  (p_id, 5, 'Brittany L.', 'Adds a lovely shine without weighing my hair down.', 'https://images.unsplash.com/photo-1590439471360-6182ac1ab4a5?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', true, now() - interval '3 weeks'),
  (p_id, 5, 'Samantha M.', 'The Reishi extract really seems to help with my itchy scalp.', null, true, now() - interval '1 month'),
  (p_id, 5, 'Victoria N.', 'Best hair serum I have verified. Fully organic!', null, true, now() - interval '1 month'),
  (p_id, 5, 'Elizabeth O.', 'My ends look so much healthier.', 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', true, now() - interval '2 months'),
  (p_id, 5, 'Grace Q.', 'Perfect finishing touch after styling.', null, true, now() - interval '2 months');
end if;

-- 3. Moringa & Keratin Conditioner
select id into p_id from products where slug = 'moringa-keratin-conditioner';
if p_id is not null then
  insert into reviews (product_id, rating, reviewer_name, comment, image_url, is_verified, created_at) values
  (p_id, 5, 'Zoe A.', 'Instantly detuffles my hair. So smooth!', 'https://images.unsplash.com/photo-1624456722176-5231c5b058c4?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', true, now() - interval '2 days'),
  (p_id, 5, 'Lily B.', 'Deeply hydrating. My curls love this.', null, true, now() - interval '4 days'),
  (p_id, 5, 'Madison C.', 'Smells amazing and rinses out clean. No residue.', 'https://images.unsplash.com/photo-1571537240766-3d75898d90d3?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', true, now() - interval '1 week'),
  (p_id, 5, 'Ava D.', 'My hair feels stronger after using this for a month.', null, true, now() - interval '2 weeks'),
  (p_id, 5, 'Ella E.', 'Finally a keratin conditioner that is sulfate free.', 'https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', true, now() - interval '3 weeks'),
  (p_id, 5, 'Scarlett F.', 'Makes my blowout look professional.', null, true, now() - interval '1 month'),
  (p_id, 5, 'Mia G.', 'Super soft hair. Highly recommended.', null, true, now() - interval '1 month'),
  (p_id, 5, 'Amelia H.', 'Great match with the shampoo.', 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', true, now() - interval '2 months'),
  (p_id, 5, 'Harper I.', 'Restored my bleached hair. Thank you Marom!', null, true, now() - interval '2 months'),
  (p_id, 5, 'Evelyn J.', 'Luxurious texture. Feels like a hair mask.', null, true, now() - interval '3 months');
end if;

-- 4. Moringa Shampoo
select id into p_id from products where slug = 'moringa-anti-hairfall-shampoo';
if p_id is not null then
  insert into reviews (product_id, rating, reviewer_name, comment, image_url, is_verified, created_at) values
  (p_id, 5, 'Abigail K.', 'My shower drain is finally clear of hair! It really works for hairfall.', 'https://images.unsplash.com/photo-1535585209827-a15fcdbc2c2d?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', true, now() - interval '1 day'),
  (p_id, 5, 'Sofia L.', 'Gentle but cleans really well. Love the herbal scent.', null, true, now() - interval '3 days'),
  (p_id, 5, 'Avery M.', 'Foams up nicely for a natural shampoo.', 'https://images.unsplash.com/photo-1512675823152-d1487538b84f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', true, now() - interval '5 days'),
  (p_id, 5, 'Mila N.', 'My scalp feels so fresh and breathable.', null, true, now() - interval '1 week'),
  (p_id, 5, 'Aria O.', 'Reduced my dandruff significantly.', 'https://images.unsplash.com/photo-1519735777090-ec97162dc89c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', true, now() - interval '2 weeks'),
  (p_id, 5, 'Camila P.', 'Good volume and shine.', null, true, now() - interval '3 weeks'),
  (p_id, 5, 'Gianna Q.', 'I noticed less breakage after 3 washes.', null, true, now() - interval '1 month'),
  (p_id, 5, 'Luna R.', 'The best organic shampoo in Thailand.', 'https://images.unsplash.com/photo-1626307416562-ee839676f5fc?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', true, now() - interval '1 month'),
  (p_id, 5, 'Layla S.', 'Gentle enough for daily use.', null, true, now() - interval '2 months'),
  (p_id, 5, 'Penelope T.', 'Family favorite. We all use it now.', null, true, now() - interval '3 months');
end if;

-- 5. Mosquito Repellent
select id into p_id from products where slug = 'natural-mosquito-repellent';
if p_id is not null then
  insert into reviews (product_id, rating, reviewer_name, comment, image_url, is_verified, created_at) values
  (p_id, 5, 'Riley U.', 'Smells like a spa, not chemicals! And it works.', 'https://images.unsplash.com/photo-1546843825-d7494541ecdb?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', true, now() - interval '2 days'),
  (p_id, 5, 'Nora V.', 'Safe for my kids. No sticky feeling.', null, true, now() - interval '4 days'),
  (p_id, 5, 'Hazel W.', 'Used it on a camping trip and zero bites.', 'https://images.unsplash.com/photo-1499943527712-e8890abd46ea?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', true, now() - interval '1 week'),
  (p_id, 5, 'Violet X.', 'Refreshing cooling effect on the skin.', null, true, now() - interval '2 weeks'),
  (p_id, 5, 'Aurora Y.', 'Love the natural ingredients list.', 'https://images.unsplash.com/photo-1621451537084-482c73073a06?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', true, now() - interval '3 weeks'),
  (p_id, 5, 'Savannah Z.', 'Great bottle design, easy to spray.', null, true, now() - interval '1 month'),
  (p_id, 5, 'Audrey A.', 'Finally a repellent that doesn''t smell bad.', 'https://images.unsplash.com/photo-1545529468-42764ef8c85f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', true, now() - interval '1 month'),
  (p_id, 5, 'Brooklyn B.', 'Effective and moisturizing. A win-win.', null, true, now() - interval '2 months'),
  (p_id, 5, 'Bella C.', 'Will buy again for the rainy season.', null, true, now() - interval '2 months'),
  (p_id, 5, 'Claire D.', 'Highly effective against mosquitoes in my garden.', null, true, now() - interval '3 months');
end if;

end $$;
