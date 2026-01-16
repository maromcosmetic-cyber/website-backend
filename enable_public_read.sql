
-- Enable RLS on products table if not already
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Enable read access for all users" ON "public"."products"
AS PERMISSIVE FOR SELECT
TO result
USING (true);

-- Also for ingredients if needed (already done, but safe to verify)
CREATE POLICY "Enable read access for all users" ON "public"."ingredients"
AS PERMISSIVE FOR SELECT
TO public
USING (true);
