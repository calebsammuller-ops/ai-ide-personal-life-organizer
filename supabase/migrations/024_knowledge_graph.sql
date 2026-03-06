-- 024: AI Second Brain — Full Zettelkasten Knowledge Graph System
-- DROP + RECREATE: safe to re-run in development (drops all knowledge tables first)

-- Enable pgvector for semantic embeddings
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pgvector not available — semantic auto-linking will be disabled';
END $$;

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS research_sources CASCADE;
DROP TABLE IF EXISTS dashboard_briefings CASCADE;
DROP TABLE IF EXISTS user_cognitive_profile CASCADE;
DROP TABLE IF EXISTS cognitive_events CASCADE;
DROP TABLE IF EXISTS knowledge_graph_metrics CASCADE;
DROP TABLE IF EXISTS knowledge_note_versions CASCADE;
DROP TABLE IF EXISTS knowledge_links CASCADE;
DROP TABLE IF EXISTS knowledge_notes CASCADE;

-- Drop existing function
DROP FUNCTION IF EXISTS match_knowledge_notes CASCADE;

-- Main notes table
CREATE TABLE knowledge_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zettel_id TEXT UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'permanent'
    CHECK (type IN ('fleeting','permanent','concept','experience','project','hub','reference')),
  content TEXT NOT NULL DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  confidence FLOAT DEFAULT 0.8,
  importance FLOAT DEFAULT 0.5,
  source TEXT DEFAULT 'user' CHECK (source IN ('user','AI','external')),
  source_url TEXT,
  is_archived BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add embedding column if pgvector is available
DO $$ BEGIN
  ALTER TABLE knowledge_notes ADD COLUMN IF NOT EXISTS embedding vector(1536);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add embedding column — pgvector not enabled';
END $$;

-- Bidirectional links between notes
CREATE TABLE knowledge_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_note_id UUID NOT NULL REFERENCES knowledge_notes(id) ON DELETE CASCADE,
  target_note_id UUID NOT NULL REFERENCES knowledge_notes(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'related'
    CHECK (relationship IN ('supports','contradicts','extends','applies_to','derived_from','related')),
  strength FLOAT DEFAULT 0.8,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_note_id, target_note_id)
);

-- Version history for notes
CREATE TABLE knowledge_note_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID REFERENCES knowledge_notes(id) ON DELETE CASCADE,
  content TEXT,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Graph metrics (computed on-demand)
CREATE TABLE knowledge_graph_metrics (
  note_id UUID PRIMARY KEY REFERENCES knowledge_notes(id) ON DELETE CASCADE,
  degree_centrality FLOAT DEFAULT 0,
  cluster_id INTEGER,
  importance_score FLOAT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cognitive timeline events
CREATE TABLE cognitive_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT CHECK (event_type IN (
    'note_created','note_updated','insight_generated',
    'idea_generated','knowledge_gap_detected','research_added','link_created'
  )),
  related_note_ids UUID[] DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User cognitive profile
CREATE TABLE user_cognitive_profile (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  top_topics TEXT[] DEFAULT '{}',
  thinking_style TEXT DEFAULT 'balanced',
  curiosity_clusters TEXT[] DEFAULT '{}',
  idea_velocity FLOAT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dashboard briefing cache
CREATE TABLE dashboard_briefings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  briefing TEXT,
  insights JSONB DEFAULT '[]',
  opportunities JSONB DEFAULT '[]',
  knowledge_gaps JSONB DEFAULT '[]',
  learning_path JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Research sources extracted from URLs
CREATE TABLE research_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT CHECK (source_type IN ('article','video','paper','website','pdf')),
  title TEXT,
  url TEXT,
  summary TEXT,
  notes_created INT DEFAULT 0,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_knowledge_notes_user ON knowledge_notes(user_id);
CREATE INDEX idx_knowledge_notes_type ON knowledge_notes(type);
CREATE INDEX idx_knowledge_notes_archived ON knowledge_notes(is_archived);
CREATE INDEX idx_knowledge_links_source ON knowledge_links(source_note_id);
CREATE INDEX idx_knowledge_links_target ON knowledge_links(target_note_id);
CREATE INDEX idx_cognitive_events_user ON cognitive_events(user_id);
CREATE INDEX idx_cognitive_events_created ON cognitive_events(created_at DESC);

-- Vector similarity index (requires pgvector)
DO $$ BEGIN
  CREATE INDEX idx_knowledge_notes_embedding ON knowledge_notes USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create vector index — pgvector not enabled';
END $$;

-- Function: find semantically similar notes (requires pgvector)
DO $outer$ BEGIN
  EXECUTE $func$
    CREATE OR REPLACE FUNCTION match_knowledge_notes(
      query_embedding vector(1536),
      match_user_id UUID,
      match_threshold FLOAT DEFAULT 0.78,
      match_count INT DEFAULT 10
    )
    RETURNS TABLE (
      id UUID,
      title TEXT,
      type TEXT,
      content TEXT,
      similarity FLOAT
    )
    LANGUAGE sql STABLE
    AS $body$
      SELECT
        kn.id,
        kn.title,
        kn.type,
        kn.content,
        1 - (kn.embedding <=> query_embedding) AS similarity
      FROM knowledge_notes kn
      WHERE kn.user_id = match_user_id
        AND kn.is_archived = false
        AND kn.embedding IS NOT NULL
        AND 1 - (kn.embedding <=> query_embedding) > match_threshold
      ORDER BY kn.embedding <=> query_embedding
      LIMIT match_count;
    $body$;
  $func$;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create match_knowledge_notes — pgvector not enabled (this is fine, auto-linking will be skipped)';
END $outer$;

-- RLS
ALTER TABLE knowledge_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_note_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_graph_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cognitive_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cognitive_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_sources ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users manage own knowledge notes" ON knowledge_notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own knowledge links" ON knowledge_links FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own note versions" ON knowledge_note_versions FOR ALL USING (
  auth.uid() = (SELECT user_id FROM knowledge_notes WHERE id = note_id)
);
CREATE POLICY "Users manage own graph metrics" ON knowledge_graph_metrics FOR ALL USING (
  auth.uid() = (SELECT user_id FROM knowledge_notes WHERE id = note_id)
);
CREATE POLICY "Users manage own cognitive events" ON cognitive_events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own cognitive profile" ON user_cognitive_profile FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own briefings" ON dashboard_briefings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own research" ON research_sources FOR ALL USING (auth.uid() = user_id);
