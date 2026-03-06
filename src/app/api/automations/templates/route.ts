import { NextResponse } from 'next/server'

const AUTOMATION_TEMPLATES = [
  {
    id: 'award-xp-task-completion',
    name: 'Award XP on task completion',
    description: 'Automatically award XP when a task is completed',
    triggerType: 'task_completed',
    conditions: {},
    actionType: 'award_xp',
    actionConfig: { amount: 50 },
  },
  {
    id: 'followup-high-priority',
    name: 'Create follow-up on high priority',
    description: 'Create a follow-up task when a high priority task is completed',
    triggerType: 'task_completed',
    conditions: { priority: 'high' },
    actionType: 'create_task',
    actionConfig: {},
  },
  {
    id: 'streak-milestone-notify',
    name: 'Streak milestone notification',
    description: 'Send a notification when a habit streak reaches 7 days',
    triggerType: 'habit_streak',
    conditions: { streak: 7 },
    actionType: 'notify',
    actionConfig: {},
  },
]

export async function GET() {
  return NextResponse.json({ data: AUTOMATION_TEMPLATES })
}
