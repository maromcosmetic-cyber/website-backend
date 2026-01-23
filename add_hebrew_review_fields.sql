-- Add Hebrew translation fields to reviews table
ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS reviewer_name_he TEXT,
ADD COLUMN IF NOT EXISTS comment_he TEXT;

-- Add comment for documentation
COMMENT ON COLUMN reviews.reviewer_name_he IS 'Hebrew translation of reviewer name';
COMMENT ON COLUMN reviews.comment_he IS 'Hebrew translation of review comment';
