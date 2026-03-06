export interface AutomationTemplate {
  id: string
  name: string
  description: string
  triggerType: string
  conditions: Record<string, unknown>
  actionType: string
  actionConfig: Record<string, unknown>
  icon: string
}

export const automationTemplates: AutomationTemplate[] = [
  {
    id: 'xp-on-task-complete',
    name: 'Award XP on Task Completion',
    description: 'Earn XP every time you complete a task',
    triggerType: 'task_completed',
    conditions: {},
    actionType: 'award_xp',
    actionConfig: { amount: 25, reason: 'Task completed' },
    icon: '⚡',
  },
  {
    id: 'xp-high-priority',
    name: 'Bonus XP for High Priority Tasks',
    description: 'Earn extra XP for completing high priority tasks',
    triggerType: 'task_completed',
    conditions: { priority: 'high' },
    actionType: 'award_xp',
    actionConfig: { amount: 50, reason: 'High priority task completed' },
    icon: '🔥',
  },
  {
    id: 'followup-high-priority',
    name: 'Create Follow-up for High Priority',
    description: 'Automatically create a follow-up task when completing high priority tasks',
    triggerType: 'task_completed',
    conditions: { priority: 'high' },
    actionType: 'create_task',
    actionConfig: { title: 'Follow-up: Review completed task', priority: 'medium' },
    icon: '📋',
  },
  {
    id: 'xp-habit-complete',
    name: 'Award XP on Habit Completion',
    description: 'Earn XP every time you complete a habit',
    triggerType: 'habit_completed',
    conditions: {},
    actionType: 'award_xp',
    actionConfig: { amount: 15, reason: 'Habit completed' },
    icon: '✅',
  },
  {
    id: 'streak-milestone-7',
    name: '7-Day Streak Celebration',
    description: 'Get notified and earn bonus XP on a 7-day streak',
    triggerType: 'habit_streak',
    conditions: { streak: 7 },
    actionType: 'award_xp',
    actionConfig: { amount: 100, reason: '7-day streak milestone!' },
    icon: '🏆',
  },
  {
    id: 'streak-milestone-30',
    name: '30-Day Streak Achievement',
    description: 'Major XP reward for maintaining a 30-day streak',
    triggerType: 'habit_streak',
    conditions: { streak: 30 },
    actionType: 'award_xp',
    actionConfig: { amount: 500, reason: '30-day streak achievement!' },
    icon: '👑',
  },
]
