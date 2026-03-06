-- Drop existing policies (safe: ignores missing tables)
DO $$
BEGIN
  BEGIN DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Users can create their own tasks" ON tasks; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Users can view their own focus blocks" ON focus_blocks; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Users can create their own focus blocks" ON focus_blocks; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Users can update their own focus blocks" ON focus_blocks; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Users can delete their own focus blocks" ON focus_blocks; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Users can view their own gamification stats" ON gamification_stats; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Users can insert their own gamification stats" ON gamification_stats; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Users can update their own gamification stats" ON gamification_stats; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Users can view their own XP events" ON xp_events; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Users can insert their own XP events" ON xp_events; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Users can view their own subscription" ON user_subscriptions; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Service role can manage subscriptions" ON user_subscriptions; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Authenticated users can view feature limits" ON subscription_features; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Users can manage own consents" ON user_consents; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Users can manage own integrations" ON user_integrations; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "projects_all" ON projects; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "task_dependencies_all" ON task_dependencies; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "time_entries_all" ON time_entries; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "task_comments_all" ON task_comments; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "task_activity_all" ON task_activity; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "documents_all" ON documents; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "saved_views_all" ON saved_views; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "automation_rules_all" ON automation_rules; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "dashboards_all" ON dashboards; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "dashboard_widgets_all" ON dashboard_widgets; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "math_problems_all" ON math_problems; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "math_practice_sessions_all" ON math_practice_sessions; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "math_stats_all" ON math_stats; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Users can manage their own attachments" ON task_attachments; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Users see own signals" ON user_activity_signals; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Authenticated users can read feature flags" ON feature_flags; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Users see own decisions" ON ai_decisions; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Users can read own reflections" ON weekly_reflections; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Users can insert own reflections" ON weekly_reflections; EXCEPTION WHEN undefined_table THEN NULL; END;
END
$$;

-- Motion AI: Tasks table for auto-scheduling
-- Run this migration in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  -- Scheduling fields
  deadline TIMESTAMPTZ,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  -- Priority and classification
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  energy_level TEXT CHECK (energy_level IN ('low', 'medium', 'high')),
  category TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled', 'deferred')),
  is_auto_scheduled BOOLEAN DEFAULT true,
  -- Linked entities
  linked_calendar_event_id UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
  linked_habit_id UUID REFERENCES habits(id) ON DELETE SET NULL,
  -- Tracking
  reschedule_count INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled ON tasks(scheduled_start, scheduled_end);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_updated_at_trigger ON tasks;
CREATE TRIGGER tasks_updated_at_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- Motion AI: Focus Blocks table for protected deep work time
-- Run this migration in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS focus_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Focus Time',
  -- Time settings (stored as TIME for recurring blocks)
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  -- Recurrence: which days this applies (0=Sunday, 1=Monday, etc.)
  days_of_week INTEGER[] DEFAULT '{1,2,3,4,5}'::INTEGER[],
  -- Protection settings
  is_protected BOOLEAN DEFAULT true,
  allow_high_priority_override BOOLEAN DEFAULT false,
  buffer_minutes INTEGER DEFAULT 15,
  -- Activity preferences
  preferred_task_types TEXT[] DEFAULT '{}',
  blocked_categories TEXT[] DEFAULT '{"meeting", "call"}',
  -- Status
  is_active BOOLEAN DEFAULT true,
  -- Appearance
  color TEXT DEFAULT '#6366f1',
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_focus_blocks_user_id ON focus_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_blocks_active ON focus_blocks(user_id, is_active);

-- Enable Row Level Security
ALTER TABLE focus_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own focus blocks"
  ON focus_blocks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own focus blocks"
  ON focus_blocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own focus blocks"
  ON focus_blocks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own focus blocks"
  ON focus_blocks FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_focus_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS focus_blocks_updated_at_trigger ON focus_blocks;
CREATE TRIGGER focus_blocks_updated_at_trigger
  BEFORE UPDATE ON focus_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_focus_blocks_updated_at();

-- Motion AI: Add scheduling preferences to user_preferences
-- Run this migration in your Supabase SQL Editor

-- Add new columns for scheduling preferences
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS peak_productivity_hours JSONB DEFAULT '["09:00", "10:00", "11:00", "14:00", "15:00"]'::jsonb,
ADD COLUMN IF NOT EXISTS low_energy_hours JSONB DEFAULT '["13:00", "16:00", "17:00"]'::jsonb,
ADD COLUMN IF NOT EXISTS default_task_duration INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS auto_schedule_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS smart_reschedule_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS buffer_between_tasks INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS max_focus_session_minutes INTEGER DEFAULT 90,
ADD COLUMN IF NOT EXISTS preferred_break_duration INTEGER DEFAULT 15;

-- Add scheduling-related column to calendar_events for task linking
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS source_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_focus_block BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS energy_level TEXT CHECK (energy_level IN ('low', 'medium', 'high'));

-- Index for task-linked events
CREATE INDEX IF NOT EXISTS idx_calendar_events_source_task ON calendar_events(source_task_id) WHERE source_task_id IS NOT NULL;

-- Migration: Add scheduling fields to habits table
-- This enables habits to be auto-scheduled as tasks

-- Add scheduling columns to habits
ALTER TABLE habits ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 15;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS energy_level TEXT CHECK (energy_level IN ('low', 'medium', 'high'));
ALTER TABLE habits ADD COLUMN IF NOT EXISTS auto_schedule BOOLEAN DEFAULT false;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS preferred_time_of_day TEXT CHECK (preferred_time_of_day IN ('morning', 'afternoon', 'evening', 'anytime'));
ALTER TABLE habits ADD COLUMN IF NOT EXISTS scheduling_priority INTEGER DEFAULT 3 CHECK (scheduling_priority >= 1 AND scheduling_priority <= 5);

-- Comments for documentation
COMMENT ON COLUMN habits.duration_minutes IS 'How long the habit takes to complete';
COMMENT ON COLUMN habits.energy_level IS 'Energy level required: low, medium, high';
COMMENT ON COLUMN habits.auto_schedule IS 'Whether to auto-create tasks for this habit';
COMMENT ON COLUMN habits.preferred_time_of_day IS 'Preferred time slot for scheduling';
COMMENT ON COLUMN habits.scheduling_priority IS 'Priority for scheduling (1=urgent, 5=lowest)';

-- Create index for auto-scheduled habits lookup
CREATE INDEX IF NOT EXISTS idx_habits_auto_schedule ON habits(user_id, auto_schedule) WHERE auto_schedule = true AND is_active = true;

-- Migration: Add scheduling fields to meal_plans table
-- This enables meal prep and meal times to be auto-scheduled as tasks

-- Add scheduling columns to meal_plans
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS auto_schedule_prep BOOLEAN DEFAULT false;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS auto_schedule_meal BOOLEAN DEFAULT false;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS meal_time TIME;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS prep_scheduled_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS meal_scheduled_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

-- Default meal times based on meal_type
COMMENT ON COLUMN meal_plans.auto_schedule_prep IS 'Auto-create a task for meal prep';
COMMENT ON COLUMN meal_plans.auto_schedule_meal IS 'Auto-create a task/reminder for the meal';
COMMENT ON COLUMN meal_plans.meal_time IS 'Specific time for the meal (optional, defaults by meal_type)';
COMMENT ON COLUMN meal_plans.prep_scheduled_task_id IS 'Reference to the auto-created prep task';
COMMENT ON COLUMN meal_plans.meal_scheduled_task_id IS 'Reference to the auto-created meal task';

-- Create index for meal scheduling lookup
CREATE INDEX IF NOT EXISTS idx_meal_plans_auto_schedule ON meal_plans(user_id, date) WHERE auto_schedule_prep = true OR auto_schedule_meal = true;

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

-- User Subscriptions Table for Commercial Features
-- Run this migration in your Supabase SQL Editor

-- Create subscription_tier enum-like check
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Subscription tier: free, pro, premium
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'premium')),

  -- Billing status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'paused')),

  -- Stripe integration
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,

  -- Billing period
  billing_period TEXT CHECK (billing_period IN ('monthly', 'yearly')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,

  -- Trial tracking
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,

  -- Usage tracking for metered features
  api_calls_this_month INTEGER DEFAULT 0,
  web_searches_this_month INTEGER DEFAULT 0,
  ai_messages_this_month INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Feature limits by tier
CREATE TABLE IF NOT EXISTS subscription_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'premium')),

  -- AI Features
  ai_messages_per_month INTEGER NOT NULL,
  web_search_enabled BOOLEAN NOT NULL DEFAULT false,
  web_searches_per_month INTEGER DEFAULT 0,
  advanced_ai_features BOOLEAN DEFAULT false,

  -- Scheduling Features
  auto_scheduling_enabled BOOLEAN DEFAULT true,
  focus_blocks_limit INTEGER DEFAULT 3,

  -- Storage & History
  history_retention_days INTEGER DEFAULT 30,
  file_attachments_enabled BOOLEAN DEFAULT false,

  -- Support
  priority_support BOOLEAN DEFAULT false,

  UNIQUE(tier)
);

-- Insert default feature limits
INSERT INTO subscription_features (tier, ai_messages_per_month, web_search_enabled, web_searches_per_month, advanced_ai_features, auto_scheduling_enabled, focus_blocks_limit, history_retention_days, file_attachments_enabled, priority_support)
VALUES
  ('free', 50, false, 0, false, true, 3, 30, false, false),
  ('pro', 500, true, 100, true, true, 10, 90, true, false),
  ('premium', -1, true, -1, true, true, -1, 365, true, true)
ON CONFLICT (tier) DO UPDATE SET
  ai_messages_per_month = EXCLUDED.ai_messages_per_month,
  web_search_enabled = EXCLUDED.web_search_enabled,
  web_searches_per_month = EXCLUDED.web_searches_per_month,
  advanced_ai_features = EXCLUDED.advanced_ai_features,
  auto_scheduling_enabled = EXCLUDED.auto_scheduling_enabled,
  focus_blocks_limit = EXCLUDED.focus_blocks_limit,
  history_retention_days = EXCLUDED.history_retention_days,
  file_attachments_enabled = EXCLUDED.file_attachments_enabled,
  priority_support = EXCLUDED.priority_support;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription ON user_subscriptions(stripe_subscription_id);

-- Enable RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_features ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view their own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON user_subscriptions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for subscription_features (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view feature limits"
  ON subscription_features FOR SELECT
  USING (auth.role() = 'authenticated');

-- Function to get user's current tier and limits
CREATE OR REPLACE FUNCTION get_user_subscription_features(p_user_id UUID)
RETURNS TABLE (
  tier TEXT,
  status TEXT,
  ai_messages_per_month INTEGER,
  ai_messages_used INTEGER,
  web_search_enabled BOOLEAN,
  web_searches_per_month INTEGER,
  web_searches_used INTEGER,
  advanced_ai_features BOOLEAN,
  focus_blocks_limit INTEGER,
  is_trial BOOLEAN,
  trial_days_remaining INTEGER
) AS $$
DECLARE
  v_tier TEXT;
  v_status TEXT;
  v_trial_end TIMESTAMPTZ;
  v_ai_used INTEGER;
  v_search_used INTEGER;
BEGIN
  -- Get subscription info
  SELECT
    COALESCE(us.tier, 'free'),
    COALESCE(us.status, 'active'),
    us.trial_end,
    COALESCE(us.ai_messages_this_month, 0),
    COALESCE(us.web_searches_this_month, 0)
  INTO v_tier, v_status, v_trial_end, v_ai_used, v_search_used
  FROM user_subscriptions us
  WHERE us.user_id = p_user_id;

  -- Default to free if no subscription record
  IF v_tier IS NULL THEN
    v_tier := 'free';
    v_status := 'active';
    v_ai_used := 0;
    v_search_used := 0;
  END IF;

  RETURN QUERY
  SELECT
    v_tier,
    v_status,
    sf.ai_messages_per_month,
    v_ai_used,
    sf.web_search_enabled,
    sf.web_searches_per_month,
    v_search_used,
    sf.advanced_ai_features,
    sf.focus_blocks_limit,
    v_trial_end IS NOT NULL AND v_trial_end > NOW(),
    CASE
      WHEN v_trial_end IS NOT NULL AND v_trial_end > NOW()
      THEN EXTRACT(DAY FROM v_trial_end - NOW())::INTEGER
      ELSE 0
    END
  FROM subscription_features sf
  WHERE sf.tier = v_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment usage counters
CREATE OR REPLACE FUNCTION increment_subscription_usage(
  p_user_id UUID,
  p_usage_type TEXT -- 'ai_message', 'web_search', 'api_call'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
  v_limit INTEGER;
  v_current INTEGER;
BEGIN
  -- Ensure user has a subscription record
  INSERT INTO user_subscriptions (user_id, tier)
  VALUES (p_user_id, 'free')
  ON CONFLICT (user_id) DO NOTHING;

  -- Get current tier
  SELECT tier INTO v_tier FROM user_subscriptions WHERE user_id = p_user_id;

  -- Get limit for usage type
  SELECT
    CASE p_usage_type
      WHEN 'ai_message' THEN ai_messages_per_month
      WHEN 'web_search' THEN web_searches_per_month
      ELSE 0
    END INTO v_limit
  FROM subscription_features
  WHERE tier = v_tier;

  -- Get current usage
  SELECT
    CASE p_usage_type
      WHEN 'ai_message' THEN ai_messages_this_month
      WHEN 'web_search' THEN web_searches_this_month
      WHEN 'api_call' THEN api_calls_this_month
      ELSE 0
    END INTO v_current
  FROM user_subscriptions
  WHERE user_id = p_user_id;

  -- Check if under limit (-1 means unlimited)
  IF v_limit != -1 AND v_current >= v_limit THEN
    RETURN FALSE;
  END IF;

  -- Increment counter
  UPDATE user_subscriptions
  SET
    ai_messages_this_month = CASE WHEN p_usage_type = 'ai_message' THEN ai_messages_this_month + 1 ELSE ai_messages_this_month END,
    web_searches_this_month = CASE WHEN p_usage_type = 'web_search' THEN web_searches_this_month + 1 ELSE web_searches_this_month END,
    api_calls_this_month = CASE WHEN p_usage_type = 'api_call' THEN api_calls_this_month + 1 ELSE api_calls_this_month END,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset monthly usage (run via cron on 1st of month)
CREATE OR REPLACE FUNCTION reset_monthly_subscription_usage()
RETURNS void AS $$
BEGIN
  UPDATE user_subscriptions
  SET
    api_calls_this_month = 0,
    web_searches_this_month = 0,
    ai_messages_this_month = 0,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create user_consents table for tracking explicit user permissions
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT FALSE,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, consent_type)
);

-- Enable RLS
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

-- Users can manage their own consents
CREATE POLICY "Users can manage own consents" ON user_consents
  FOR ALL USING (auth.uid() = user_id);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_type ON user_consents(user_id, consent_type);

-- Create user_integrations table for storing OAuth tokens
CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  scopes TEXT[],
  metadata JSONB DEFAULT '{}',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

-- Users can manage their own integrations
CREATE POLICY "Users can manage own integrations" ON user_integrations
  FOR ALL USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_provider ON user_integrations(user_id, provider);

-- ClickUp 4.0 Foundation: Projects, Dependencies, Time Tracking, Comments, Activity

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'folder',
  parent_project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
  sort_order INTEGER DEFAULT 0,
  is_template BOOLEAN DEFAULT false,
  template_data JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extend tasks with project, subtask, and progress fields
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN DEFAULT false;

-- Task dependencies
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL DEFAULT 'blocks' CHECK (dependency_type IN ('blocks', 'blocked_by', 'related')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, depends_on_task_id)
);

-- Time tracking entries
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  description TEXT,
  is_running BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task comments
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task activity log
CREATE TABLE IF NOT EXISTS task_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_parent ON projects(parent_project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_task_deps_task ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_deps_depends ON task_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_task ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_running ON time_entries(user_id, is_running) WHERE is_running = true;
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_task ON task_activity(task_id);

-- RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_all" ON projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "task_dependencies_all" ON task_dependencies FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "time_entries_all" ON time_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "task_comments_all" ON task_comments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "task_activity_all" ON task_activity FOR ALL USING (auth.uid() = user_id);

-- Docs/Notes System + Saved Views

-- Documents table (Tiptap JSON content)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  plain_text_content TEXT DEFAULT '',
  linked_task_ids UUID[] DEFAULT ARRAY[]::UUID[],
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_pinned BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved filter views
CREATE TABLE IF NOT EXISTS saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('tasks', 'habits', 'documents', 'all')),
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_config JSONB DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_search ON documents USING GIN (to_tsvector('english', plain_text_content));
CREATE INDEX IF NOT EXISTS idx_saved_views_user ON saved_views(user_id);

-- RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_all" ON documents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "saved_views_all" ON saved_views FOR ALL USING (auth.uid() = user_id);

-- Workflow Automations + Habit Progress Tracking

-- Automation rules
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'task_completed', 'task_created', 'task_status_changed',
    'habit_completed', 'habit_streak_reached',
    'time_entry_logged', 'deadline_approaching',
    'project_completed', 'xp_milestone', 'schedule_event'
  )),
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  conditions JSONB DEFAULT '[]'::jsonb,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'award_xp', 'create_task', 'update_task_status',
    'send_notification', 'create_achievement',
    'move_to_project', 'add_tag', 'log_activity',
    'create_document'
  )),
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extend habits with progress tracking
ALTER TABLE habits ADD COLUMN IF NOT EXISTS streak_goal INTEGER DEFAULT 30;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS target_completion_rate NUMERIC(5,2) DEFAULT 80.00;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS milestones JSONB DEFAULT '[]'::jsonb;

-- Indexes and RLS
CREATE INDEX IF NOT EXISTS idx_automation_rules_user ON automation_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON automation_rules(trigger_type);

ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automation_rules_all" ON automation_rules FOR ALL USING (auth.uid() = user_id);

-- Custom Dashboards

CREATE TABLE IF NOT EXISTS dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Dashboard',
  is_default BOOLEAN DEFAULT false,
  layout JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL CHECK (widget_type IN (
    'task_list', 'habit_streaks', 'time_summary', 'xp_chart',
    'progress_bar', 'calendar_upcoming', 'completion_chart',
    'streak_counter', 'project_overview', 'quick_actions',
    'math_stats', 'focus_timer', 'daily_plan_summary'
  )),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  width INTEGER DEFAULT 1,
  height INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes and RLS
CREATE INDEX IF NOT EXISTS idx_dashboards_user ON dashboards(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_dashboard ON dashboard_widgets(dashboard_id);

ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dashboards_all" ON dashboards FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "dashboard_widgets_all" ON dashboard_widgets FOR ALL USING (auth.uid() = user_id);

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

-- Phase 7: Attachments and Polish

-- Task attachments table
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  file_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own attachments"
  ON task_attachments FOR ALL
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_user_id ON task_attachments(user_id);

-- Create storage bucket for task attachments (run in Supabase dashboard if this doesn't work via migration)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('task-attachments', 'task-attachments', true) ON CONFLICT DO NOTHING;

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

CREATE INDEX IF NOT EXISTS idx_activity_signals_user_id ON user_activity_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_signals_type ON user_activity_signals(user_id, signal_type);
CREATE INDEX IF NOT EXISTS idx_activity_signals_expires ON user_activity_signals(expires_at);

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

CREATE INDEX IF NOT EXISTS idx_ai_decisions_user_id ON ai_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_created ON ai_decisions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_agent ON ai_decisions(user_id, agent);

-- Migration 017: Persistent Assistant Feature Flags
-- Adds 3 new feature flags for the floating AI assistant system

INSERT INTO feature_flags (name, description, enabled, kill_switch, rollout_percentage, plan_required)
VALUES
  ('persistent_assistant', 'Floating AI assistant bubble that persists across all pages', true, false, 100, 'free'),
  ('context_awareness', 'AI context awareness - shares current page and visible content with the assistant', true, false, 100, 'free'),
  ('background_voice', 'Background voice mode - keeps voice conversations active when app is backgrounded (iOS)', true, false, 100, 'pro')
ON CONFLICT (name) DO NOTHING;

-- Migration 018: Truth Mode preference
-- Adds truth_mode column for controlling AI directness level

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS truth_mode text DEFAULT 'direct';

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

-- Study Assistant: expand math solver to all subjects
ALTER TABLE math_problems ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT 'Mathematics';
ALTER TABLE math_practice_sessions ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT 'Mathematics';
CREATE INDEX IF NOT EXISTS idx_math_problems_subject ON math_problems(user_id, subject);
CREATE INDEX IF NOT EXISTS idx_math_sessions_subject ON math_practice_sessions(user_id, subject);
