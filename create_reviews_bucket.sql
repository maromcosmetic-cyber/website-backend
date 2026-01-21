-- Create storage bucket for reviews
insert into storage.buckets (id, name, public)
values ('reviews', 'reviews', true)
on conflict (id) do nothing;

-- Policy: Public Read Access
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'reviews' );

-- Policy: Authenticated Upload Access
create policy "Authenticated Users Can Upload"
  on storage.objects for insert
  with check (
    bucket_id = 'reviews' 
    and auth.role() = 'authenticated'
  );
