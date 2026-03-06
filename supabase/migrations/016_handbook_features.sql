-- Handbook Features: Activity Signals, Feature Flags, Decision Journal

-- ============================================
-- 1. Activity Signals (Short-Term Memory Layer)
-- ============================================
CREATE TABLE IF NOT EXISTS user_activity_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL, -- 'habit_completed', 'habit_skipped', 'task_completed', 'task_rescheduled', 'event_cancelled', 'focus_block_used', 'late_night_activity', 'ai_suggestion_accepted', 'ai_suggestion_ignored'
  signal_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days')
);

ALTER TABLE user_activity_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own signals" ON user_activity_signals
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_activity_signals_user_id ON user_activity_signals(user_id);
CREATE INDEX idx_activity_signals_type ON user_activity_signals(user_id, signal_type);
CREATE INDEX idx_activity_signals_expires ON user_activity_signals(expires_at);

-- ============================================
-- 2. Feature Flags + Kill Switches
-- ============================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  rollout_percentage INTEGER NOT NULL DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  plan_required TEXT DEFAULT NULL, -- null = all users, 'pro', 'premium'
  kill_switch BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Feature flags are read-only for authenticated users (admin manages via dashboard)
CREATE POLICY "Authenticated users can read feature flags" ON feature_flags
  FOR SELECT USING (auth.role() = 'authenticated');

-- Seed default feature flags
INSERT INTO feature_flags (name, description, enabled, rollout_percentage, plan_required, kill_switch) VALUES
  ('ai_assistant', 'Core AI assistant functionality', true, 100, NULL, false),
  ('web_search', 'AI web search capability', true, 100, 'pro', false),
  ('voice_mode', 'Voice-to-voice AI interaction', true, 100, 'pro', false),
  ('automations', 'Automation rules engine', true, 100, 'pro', false),
  ('learning_pipeline', 'AI pattern learning', true, 100, 'pro', false),
  ('push_notifications', 'Push notification delivery', true, 100, NULL, false),
  ('math_solver', 'Math problem solver', true, 100, NULL, false),
  ('kanban_view', 'Kanban board task view', true, 100, 'pro', false),
  ('timeline_view', 'Gantt timeline task view', true, 100, 'pro', false),
  ('table_view', 'Table task view', true, 100, 'pro', false),
  ('documents', 'Rich text documents', true, 100, 'pro', false),
  ('time_tracking', 'Time tracking & reports', true, 100, NULL, false),
  ('file_generation', 'Export to Excel/CSV/PDF', true, 100, 'pro', false)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 3. AI Decision Journal
-- ============================================
CREATE TABLE IF NOT EXISTS ai_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- What the AI did or suggested
  reason TEXT NOT NULL, -- Why it did it
  agent TEXT NOT NULL DEFAULT 'executor', -- Which sub-agent: 'planner', 'analyzer', 'notifier', 'executor'
  data_used TEXT[] DEFAULT '{}', -- What data sources informed the decision
  confidence FLOAT DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  undo_instructions TEXT, -- How to reverse this action
  was_reversed BOOLEAN DEFAULT false,
  was_accepted BOOLEAN DEFAULT true, -- Did the user accept the suggestion?
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own decisions" ON ai_decisions
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_ai_decisions_user_id ON ai_decisions(user_id);
CREATE INDEX idx_ai_decisions_created ON ai_decisions(user_id, created_at DESC);
CREATE INDEX idx_ai_decisions_agent ON ai_decisions(user_id, agent);
