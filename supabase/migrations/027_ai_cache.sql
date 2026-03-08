-- AI result cache to reduce cost and latency for expensive intelligence features
CREATE TABLE IF NOT EXISTS knowledge_ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cache_type TEXT NOT NULL,  -- 'cognitive_mirror' | 'strategy' | 'trajectory'
  result JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_cache_user_type
  ON knowledge_ai_cache(user_id, cache_type);

ALTER TABLE knowledge_ai_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cache"
  ON knowledge_ai_cache FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
