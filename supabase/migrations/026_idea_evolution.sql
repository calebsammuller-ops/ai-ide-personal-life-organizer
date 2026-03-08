-- Idea Evolution Engine: tracks how ideas grow over time
CREATE TABLE IF NOT EXISTS idea_evolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_note_id UUID NOT NULL REFERENCES knowledge_notes(id) ON DELETE CASCADE,
  derived_note_id UUID REFERENCES knowledge_notes(id) ON DELETE SET NULL,
  evolution_type TEXT NOT NULL CHECK (evolution_type IN ('expansion', 'connection', 'insight')),
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_idea_evolutions_source ON idea_evolutions(source_note_id);
CREATE INDEX IF NOT EXISTS idx_idea_evolutions_user ON idea_evolutions(user_id, created_at DESC);

-- Row-level security
ALTER TABLE idea_evolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own evolutions"
  ON idea_evolutions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
