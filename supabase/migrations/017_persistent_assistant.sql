-- Migration 017: Persistent Assistant Feature Flags
-- Adds 3 new feature flags for the floating AI assistant system

INSERT INTO feature_flags (name, description, enabled, kill_switch, rollout_percentage, min_plan)
VALUES
  ('persistent_assistant', 'Floating AI assistant bubble that persists across all pages', true, false, 100, 'free'),
  ('context_awareness', 'AI context awareness - shares current page and visible content with the assistant', true, false, 100, 'free'),
  ('background_voice', 'Background voice mode - keeps voice conversations active when app is backgrounded (iOS)', true, false, 100, 'pro')
ON CONFLICT (name) DO NOTHING;
