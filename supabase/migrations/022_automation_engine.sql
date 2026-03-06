-- 022: Extend automation_rules to support scheduled (time-based) triggers

-- Add daily_time and weekly_time to the trigger_type constraint
ALTER TABLE automation_rules
  DROP CONSTRAINT IF EXISTS automation_rules_trigger_type_check;

ALTER TABLE automation_rules
  ADD CONSTRAINT automation_rules_trigger_type_check
  CHECK (trigger_type IN (
    'task_completed', 'task_created', 'task_status_changed',
    'habit_completed', 'habit_streak_reached',
    'time_entry_logged', 'deadline_approaching',
    'project_completed', 'xp_milestone', 'schedule_event',
    'daily_time', 'weekly_time', 'monthly_date'
  ));

-- Add action types for direct creation (create_event was missing)
ALTER TABLE automation_rules
  DROP CONSTRAINT IF EXISTS automation_rules_action_type_check;

ALTER TABLE automation_rules
  ADD CONSTRAINT automation_rules_action_type_check
  CHECK (action_type IN (
    'award_xp', 'create_task', 'update_task_status',
    'send_notification', 'create_achievement',
    'move_to_project', 'add_tag', 'log_activity',
    'create_document', 'create_event', 'capture_thought', 'send_brief'
  ));
