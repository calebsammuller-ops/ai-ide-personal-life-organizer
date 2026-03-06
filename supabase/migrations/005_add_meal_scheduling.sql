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
