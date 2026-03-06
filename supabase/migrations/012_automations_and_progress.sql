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
