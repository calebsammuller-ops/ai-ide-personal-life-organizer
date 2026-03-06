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
