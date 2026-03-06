-- 019: Personal Executive AI Agent features
-- Adds: growth_phase, active_persona to user_preferences
--       weekly_reflections table

-- Add growth phase and persona to user preferences
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS growth_phase text DEFAULT 'novice',
  ADD COLUMN IF NOT EXISTS active_persona text DEFAULT 'truthful';

-- Weekly reflections table
CREATE TABLE IF NOT EXISTS weekly_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  week_end date NOT NULL,
  summary jsonb NOT NULL DEFAULT '{}',
  insights text[] NOT NULL DEFAULT '{}',
  contradictions text[] NOT NULL DEFAULT '{}',
  system_recommendations text[] NOT NULL DEFAULT '{}',
  growth_phase text NOT NULL DEFAULT 'novice',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_weekly_reflections_user_date
  ON weekly_reflections(user_id, created_at DESC);

-- Prevent duplicate reflections for the same week
CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_reflections_unique_week
  ON weekly_reflections(user_id, week_start);

-- RLS policies
ALTER TABLE weekly_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own reflections"
  ON weekly_reflections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reflections"
  ON weekly_reflections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Feature flags for new features
INSERT INTO feature_flags (name, enabled, description)
VALUES
  ('weekly_reflection', true, 'Weekly strategic reflection generation'),
  ('growth_phase', true, 'Automatic growth phase detection'),
  ('system_personas', true, 'System persona selection (truthful/strategic/mentorship/tactical)')
ON CONFLICT (name) DO NOTHING;
