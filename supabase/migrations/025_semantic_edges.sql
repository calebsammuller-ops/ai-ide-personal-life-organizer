-- Add semantic relationship type to knowledge_links
ALTER TABLE knowledge_links ADD COLUMN IF NOT EXISTS relationship_type TEXT DEFAULT 'related';
