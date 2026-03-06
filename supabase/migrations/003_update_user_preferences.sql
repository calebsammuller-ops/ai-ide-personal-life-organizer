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
