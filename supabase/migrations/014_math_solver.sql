-- Math Solver: Problems, Practice Sessions, Stats

CREATE TABLE IF NOT EXISTS math_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT,
  problem_text TEXT NOT NULL,
  solution JSONB NOT NULL DEFAULT '{}'::jsonb,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard', 'advanced')),
  topics TEXT[] DEFAULT ARRAY[]::TEXT[],
  source TEXT CHECK (source IN ('photo', 'typed', 'generated')),
  is_correct BOOLEAN,
  user_answer TEXT,
  time_taken_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS math_practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  total_problems INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  avg_time_seconds NUMERIC(10,2),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS math_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_problems_solved INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  topics_mastered TEXT[] DEFAULT ARRAY[]::TEXT[],
  weak_topics TEXT[] DEFAULT ARRAY[]::TEXT[],
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  topic_scores JSONB DEFAULT '{}'::jsonb,
  last_practiced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes and RLS
CREATE INDEX IF NOT EXISTS idx_math_problems_user ON math_problems(user_id);
CREATE INDEX IF NOT EXISTS idx_math_problems_topic ON math_problems USING GIN(topics);
CREATE INDEX IF NOT EXISTS idx_math_sessions_user ON math_practice_sessions(user_id);

ALTER TABLE math_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE math_practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE math_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "math_problems_all" ON math_problems FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "math_practice_sessions_all" ON math_practice_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "math_stats_all" ON math_stats FOR ALL USING (auth.uid() = user_id);
