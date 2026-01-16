-- Enable RLS on content_blocks if not already enabled
alter table content_blocks enable row level security;

-- Policy to allow anyone to read content_blocks (for frontend to display)
create policy "Allow public read access to content_blocks"
on content_blocks for select using (true);

-- Policy to allow anonymous/authenticated users to insert/update (upsert) content_blocks
-- WARNING: This is permissive for this demo. Ideally, restrict to authenticated admins.
create policy "Allow public upsert access to content_blocks"
on content_blocks for insert with check (true);

create policy "Allow public update access to content_blocks"
on content_blocks for update using (true);

