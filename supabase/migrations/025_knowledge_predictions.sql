-- 025: Knowledge Engine Phase 2 — Predictions & Research Missions
-- DROP + RECREATE: safe to re-run

DROP TABLE IF EXISTS research_missions CASCADE;
DROP TABLE IF EXISTS knowledge_predictions CASCADE;

-- Predictive knowledge discovery
CREATE TABLE knowledge_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  prediction_type TEXT CHECK (prediction_type IN (
    'missing_link', 'knowledge_gap', 'emerging_cluster', 'idea_opportunity', 'next_topic'
  )),
  description TEXT,
  related_note_ids UUID[] DEFAULT '{}',
  confidence FLOAT DEFAULT 0.7,
  is_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Autonomous research missions
CREATE TABLE research_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','paused')),
  sources_processed INT DEFAULT 0,
  notes_generated INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_knowledge_predictions_user ON knowledge_predictions(user_id);
CREATE INDEX idx_knowledge_predictions_dismissed ON knowledge_predictions(is_dismissed);
CREATE INDEX idx_research_missions_user ON research_missions(user_id);
CREATE INDEX idx_research_missions_status ON research_missions(status);

-- RLS
ALTER TABLE knowledge_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_missions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users manage own predictions" ON knowledge_predictions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own missions" ON research_missions FOR ALL USING (auth.uid() = user_id);
