-- ============================================================
-- 021_security_hardening.sql
-- Fixes:
--   1. Auth RLS Initialization Plan: replace auth.uid() with (select auth.uid())
--      so it is evaluated once per query, not once per row.
--   2. Function Search Path Mutable: add SET search_path = public to all functions.
--   3. time_entries.task_id: drop NOT NULL so free-timers work without a task.
--   4. shopping_list_items: create table if not already done.
-- ============================================================

-- ============================================================
-- 0. time_entries: make task_id optional
-- ============================================================
ALTER TABLE public.time_entries ALTER COLUMN task_id DROP NOT NULL;

-- ============================================================
-- 1. FUNCTIONS: add SET search_path = public
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_focus_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.reset_weekly_gamification_stats()
RETURNS void AS $$
BEGIN
  UPDATE public.gamification_stats
  SET
    weekly_xp_earned = 0,
    weekly_tasks_completed = 0,
    weekly_habits_completed = 0,
    weekly_focus_minutes = 0,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_daily_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_last_active DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
BEGIN
  SELECT last_active_date, current_daily_streak, longest_daily_streak
  INTO v_last_active, v_current_streak, v_longest_streak
  FROM public.gamification_stats
  WHERE user_id = p_user_id;

  IF v_last_active IS NULL THEN
    INSERT INTO public.gamification_stats (user_id, current_daily_streak, longest_daily_streak, last_active_date)
    VALUES (p_user_id, 1, 1, CURRENT_DATE);
  ELSIF v_last_active = CURRENT_DATE THEN
    NULL;
  ELSIF v_last_active = CURRENT_DATE - 1 THEN
    v_current_streak := v_current_streak + 1;
    v_longest_streak := GREATEST(v_longest_streak, v_current_streak);
    UPDATE public.gamification_stats
    SET
      current_daily_streak = v_current_streak,
      longest_daily_streak = v_longest_streak,
      last_active_date = CURRENT_DATE,
      lifetime_days_active = lifetime_days_active + 1,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    UPDATE public.gamification_stats
    SET
      current_daily_streak = 1,
      last_active_date = CURRENT_DATE,
      lifetime_days_active = lifetime_days_active + 1,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_subscription_features(p_user_id UUID)
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
  SELECT
    COALESCE(us.tier, 'free'),
    COALESCE(us.status, 'active'),
    us.trial_end,
    COALESCE(us.ai_messages_this_month, 0),
    COALESCE(us.web_searches_this_month, 0)
  INTO v_tier, v_status, v_trial_end, v_ai_used, v_search_used
  FROM public.user_subscriptions us
  WHERE us.user_id = p_user_id;

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
  FROM public.subscription_features sf
  WHERE sf.tier = v_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.increment_subscription_usage(
  p_user_id UUID,
  p_usage_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
  v_limit INTEGER;
  v_current INTEGER;
BEGIN
  INSERT INTO public.user_subscriptions (user_id, tier)
  VALUES (p_user_id, 'free')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT tier INTO v_tier FROM public.user_subscriptions WHERE user_id = p_user_id;

  SELECT
    CASE p_usage_type
      WHEN 'ai_message' THEN ai_messages_per_month
      WHEN 'web_search' THEN web_searches_per_month
      ELSE 0
    END INTO v_limit
  FROM public.subscription_features
  WHERE tier = v_tier;

  SELECT
    CASE p_usage_type
      WHEN 'ai_message' THEN ai_messages_this_month
      WHEN 'web_search' THEN web_searches_this_month
      WHEN 'api_call' THEN api_calls_this_month
      ELSE 0
    END INTO v_current
  FROM public.user_subscriptions
  WHERE user_id = p_user_id;

  IF v_limit != -1 AND v_current >= v_limit THEN
    RETURN FALSE;
  END IF;

  UPDATE public.user_subscriptions
  SET
    ai_messages_this_month  = CASE WHEN p_usage_type = 'ai_message' THEN ai_messages_this_month + 1 ELSE ai_messages_this_month END,
    web_searches_this_month = CASE WHEN p_usage_type = 'web_search' THEN web_searches_this_month + 1 ELSE web_searches_this_month END,
    api_calls_this_month    = CASE WHEN p_usage_type = 'api_call'   THEN api_calls_this_month + 1   ELSE api_calls_this_month   END,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.reset_monthly_subscription_usage()
RETURNS void AS $$
BEGIN
  UPDATE public.user_subscriptions
  SET
    api_calls_this_month    = 0,
    web_searches_this_month = 0,
    ai_messages_this_month  = 0,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 2. RLS POLICIES: replace auth.uid() with (select auth.uid())
-- ============================================================

-- ---- tasks ----
DROP POLICY IF EXISTS "Users can view their own tasks"   ON public.tasks;
DROP POLICY IF EXISTS "Users can create their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view own tasks"         ON public.tasks;
DROP POLICY IF EXISTS "Users can insert own tasks"       ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks"       ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks"       ON public.tasks;

CREATE POLICY "tasks_select" ON public.tasks FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ---- focus_blocks ----
DROP POLICY IF EXISTS "Users can view their own focus blocks"   ON public.focus_blocks;
DROP POLICY IF EXISTS "Users can create their own focus blocks" ON public.focus_blocks;
DROP POLICY IF EXISTS "Users can update their own focus blocks" ON public.focus_blocks;
DROP POLICY IF EXISTS "Users can delete their own focus blocks" ON public.focus_blocks;

CREATE POLICY "focus_blocks_select" ON public.focus_blocks FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "focus_blocks_insert" ON public.focus_blocks FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "focus_blocks_update" ON public.focus_blocks FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "focus_blocks_delete" ON public.focus_blocks FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ---- gamification_stats ----
DROP POLICY IF EXISTS "Users can view their own gamification stats"   ON public.gamification_stats;
DROP POLICY IF EXISTS "Users can insert their own gamification stats" ON public.gamification_stats;
DROP POLICY IF EXISTS "Users can update their own gamification stats" ON public.gamification_stats;

CREATE POLICY "gamification_stats_select" ON public.gamification_stats FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "gamification_stats_insert" ON public.gamification_stats FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "gamification_stats_update" ON public.gamification_stats FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- ---- xp_events ----
DROP POLICY IF EXISTS "Users can view their own XP events"   ON public.xp_events;
DROP POLICY IF EXISTS "Users can insert their own XP events" ON public.xp_events;

CREATE POLICY "xp_events_select" ON public.xp_events FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "xp_events_insert" ON public.xp_events FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- ---- user_subscriptions ----
DROP POLICY IF EXISTS "Users can view their own subscription"   ON public.user_subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions"   ON public.user_subscriptions;

CREATE POLICY "user_subscriptions_select" ON public.user_subscriptions FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "user_subscriptions_service" ON public.user_subscriptions FOR ALL USING ((SELECT auth.jwt()) ->> 'role' = 'service_role');

-- ---- subscription_features ----
DROP POLICY IF EXISTS "Authenticated users can view feature limits" ON public.subscription_features;

CREATE POLICY "subscription_features_select" ON public.subscription_features FOR SELECT USING ((SELECT auth.role()) = 'authenticated');

-- ---- user_consents ----
DROP POLICY IF EXISTS "Users can manage own consents" ON public.user_consents;

CREATE POLICY "user_consents_all" ON public.user_consents FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ---- user_integrations ----
DROP POLICY IF EXISTS "Users can manage own integrations" ON public.user_integrations;

CREATE POLICY "user_integrations_all" ON public.user_integrations FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ---- projects ----
DROP POLICY IF EXISTS "projects_all" ON public.projects;

CREATE POLICY "projects_all" ON public.projects FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ---- task_dependencies ----
DROP POLICY IF EXISTS "task_dependencies_all" ON public.task_dependencies;

CREATE POLICY "task_dependencies_all" ON public.task_dependencies FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ---- time_entries ----
DROP POLICY IF EXISTS "time_entries_all" ON public.time_entries;

CREATE POLICY "time_entries_all" ON public.time_entries FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ---- task_comments ----
DROP POLICY IF EXISTS "task_comments_all" ON public.task_comments;

CREATE POLICY "task_comments_all" ON public.task_comments FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ---- task_activity ----
DROP POLICY IF EXISTS "task_activity_all" ON public.task_activity;

CREATE POLICY "task_activity_all" ON public.task_activity FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ---- documents ----
DROP POLICY IF EXISTS "documents_all" ON public.documents;

CREATE POLICY "documents_all" ON public.documents FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ---- saved_views ----
DROP POLICY IF EXISTS "saved_views_all" ON public.saved_views;

CREATE POLICY "saved_views_all" ON public.saved_views FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ---- automation_rules ----
DROP POLICY IF EXISTS "automation_rules_all" ON public.automation_rules;

CREATE POLICY "automation_rules_all" ON public.automation_rules FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ---- dashboards ----
DROP POLICY IF EXISTS "dashboards_all" ON public.dashboards;

CREATE POLICY "dashboards_all" ON public.dashboards FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ---- dashboard_widgets ----
DROP POLICY IF EXISTS "dashboard_widgets_all" ON public.dashboard_widgets;

CREATE POLICY "dashboard_widgets_all" ON public.dashboard_widgets FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ---- math_problems ----
DROP POLICY IF EXISTS "math_problems_all" ON public.math_problems;

CREATE POLICY "math_problems_all" ON public.math_problems FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ---- math_practice_sessions ----
DROP POLICY IF EXISTS "math_practice_sessions_all" ON public.math_practice_sessions;

CREATE POLICY "math_practice_sessions_all" ON public.math_practice_sessions FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ---- math_stats ----
DROP POLICY IF EXISTS "math_stats_all" ON public.math_stats;

CREATE POLICY "math_stats_all" ON public.math_stats FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ---- task_attachments ----
DROP POLICY IF EXISTS "Users can manage their own attachments" ON public.task_attachments;

CREATE POLICY "task_attachments_all" ON public.task_attachments FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ---- user_activity_signals ----
DROP POLICY IF EXISTS "Users see own signals" ON public.user_activity_signals;

CREATE POLICY "user_activity_signals_all" ON public.user_activity_signals FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ---- feature_flags ----
DROP POLICY IF EXISTS "Authenticated users can read feature flags" ON public.feature_flags;

CREATE POLICY "feature_flags_select" ON public.feature_flags FOR SELECT USING ((SELECT auth.role()) = 'authenticated');

-- ---- ai_decisions ----
DROP POLICY IF EXISTS "Users see own decisions" ON public.ai_decisions;

CREATE POLICY "ai_decisions_all" ON public.ai_decisions FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ---- Tables created outside migrations (found in security advisor) ----
-- calendar_events
DROP POLICY IF EXISTS "Users can manage own events" ON public.calendar_events;
CREATE POLICY "calendar_events_all" ON public.calendar_events FOR ALL USING ((SELECT auth.uid()) = user_id);

-- calendars
DROP POLICY IF EXISTS "Users can manage own calendars" ON public.calendars;
CREATE POLICY "calendars_all" ON public.calendars FOR ALL USING ((SELECT auth.uid()) = user_id);

-- habits
DROP POLICY IF EXISTS "Users can manage own habits" ON public.habits;
CREATE POLICY "habits_all" ON public.habits FOR ALL USING ((SELECT auth.uid()) = user_id);

-- habit_completions
DROP POLICY IF EXISTS "Users can manage own completions" ON public.habit_completions;
CREATE POLICY "habit_completions_all" ON public.habit_completions FOR ALL USING ((SELECT auth.uid()) = user_id);

-- meals
DROP POLICY IF EXISTS "Users can manage own meals" ON public.meals;
CREATE POLICY "meals_all" ON public.meals FOR ALL USING ((SELECT auth.uid()) = user_id);

-- thoughts
DROP POLICY IF EXISTS "Users can manage own thoughts" ON public.thoughts;
CREATE POLICY "thoughts_all" ON public.thoughts FOR ALL USING ((SELECT auth.uid()) = user_id);

-- assistant_messages
DROP POLICY IF EXISTS "Users can manage own messages" ON public.assistant_messages;
CREATE POLICY "assistant_messages_all" ON public.assistant_messages FOR ALL USING ((SELECT auth.uid()) = user_id);

-- meal_plans
DROP POLICY IF EXISTS "Users can view own meal plans"   ON public.meal_plans;
DROP POLICY IF EXISTS "Users can insert own meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Users can update own meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Users can delete own meal plans" ON public.meal_plans;

CREATE POLICY "meal_plans_select" ON public.meal_plans FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "meal_plans_insert" ON public.meal_plans FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "meal_plans_update" ON public.meal_plans FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "meal_plans_delete" ON public.meal_plans FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============================================================
-- 3. SHOPPING LIST TABLE (if not already created)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shopping_list_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  quantity   TEXT,
  category   TEXT DEFAULT 'general',
  is_checked BOOLEAN DEFAULT false,
  meal_plan_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own shopping items" ON public.shopping_list_items;
CREATE POLICY "shopping_list_items_all" ON public.shopping_list_items FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ============================================================
-- NOTE: To fix "Leaked Password Protection Disabled":
-- Go to Supabase Dashboard → Authentication → Settings →
-- enable "Leaked Password Protection".
-- This cannot be done via SQL.
-- ============================================================
