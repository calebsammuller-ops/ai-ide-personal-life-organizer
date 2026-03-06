-- Gamification Stats Table
CREATE TABLE IF NOT EXISTS gamification_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  current_daily_streak INTEGER NOT NULL DEFAULT 0,
  longest_daily_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weekly_xp_earned INTEGER NOT NULL DEFAULT 0,
  weekly_tasks_completed INTEGER NOT NULL DEFAULT 0,
  weekly_habits_completed INTEGER NOT NULL DEFAULT 0,
  weekly_focus_minutes INTEGER NOT NULL DEFAULT 0,
  lifetime_tasks_completed INTEGER NOT NULL DEFAULT 0,
  lifetime_habits_completed INTEGER NOT NULL DEFAULT 0,
  lifetime_focus_minutes INTEGER NOT NULL DEFAULT 0,
  lifetime_days_active INTEGER NOT NULL DEFAULT 1,
  unlocked_achievement_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- XP Events Table (for tracking XP history)
CREATE TABLE IF NOT EXISTS xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('task', 'habit', 'focus', 'achievement', 'streak', 'bonus')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gamification_stats_user_id ON gamification_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_user_id ON xp_events(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_created_at ON xp_events(created_at);

-- Enable RLS
ALTER TABLE gamification_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gamification_stats
CREATE POLICY "Users can view their own gamification stats"
  ON gamification_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gamification stats"
  ON gamification_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gamification stats"
  ON gamification_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for xp_events
CREATE POLICY "Users can view their own XP events"
  ON xp_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own XP events"
  ON xp_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to reset weekly stats (run weekly via cron)
CREATE OR REPLACE FUNCTION reset_weekly_gamification_stats()
RETURNS void AS $$
BEGIN
  UPDATE gamification_stats
  SET
    weekly_xp_earned = 0,
    weekly_tasks_completed = 0,
    weekly_habits_completed = 0,
    weekly_focus_minutes = 0,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update streak on login/activity
CREATE OR REPLACE FUNCTION update_daily_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_last_active DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
BEGIN
  SELECT last_active_date, current_daily_streak, longest_daily_streak
  INTO v_last_active, v_current_streak, v_longest_streak
  FROM gamification_stats
  WHERE user_id = p_user_id;

  IF v_last_active IS NULL THEN
    -- First time user, create stats
    INSERT INTO gamification_stats (user_id, current_daily_streak, longest_daily_streak, last_active_date)
    VALUES (p_user_id, 1, 1, CURRENT_DATE);
  ELSIF v_last_active = CURRENT_DATE THEN
    -- Already active today, do nothing
    NULL;
  ELSIF v_last_active = CURRENT_DATE - 1 THEN
    -- Consecutive day, increment streak
    v_current_streak := v_current_streak + 1;
    v_longest_streak := GREATEST(v_longest_streak, v_current_streak);

    UPDATE gamification_stats
    SET
      current_daily_streak = v_current_streak,
      longest_daily_streak = v_longest_streak,
      last_active_date = CURRENT_DATE,
      lifetime_days_active = lifetime_days_active + 1,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    -- Streak broken
    UPDATE gamification_stats
    SET
      current_daily_streak = 1,
      last_active_date = CURRENT_DATE,
      lifetime_days_active = lifetime_days_active + 1,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
