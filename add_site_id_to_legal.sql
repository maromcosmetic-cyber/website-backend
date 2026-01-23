-- Support per-site legal documents
-- Assuming table name is 'legal_documents' or 'content_pages' based on API check (will conform after reading file)
-- If table is 'legal_documents':

ALTER TABLE legal_documents 
ADD COLUMN IF NOT EXISTS site_id VARCHAR(10) DEFAULT 'TH';

-- Update uniqueness to be per site
-- DROP INDEX IF EXISTS idx_legal_slug;
-- CREATE UNIQUE INDEX idx_legal_slug_site ON legal_documents(slug, site_id);
