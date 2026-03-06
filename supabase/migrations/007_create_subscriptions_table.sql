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
