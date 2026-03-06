/**
 * Habit Scheduling Integration
 *
 * Converts habits into scheduled tasks based on their frequency and preferences.
 * Uses the Atomic Habits plan to create actionable, varied daily tasks.
 * This allows habits to appear in the calendar and be tracked as tasks.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { Habit, HabitPlan } from '@/types'

type SupabaseClientType = SupabaseClient<Database>

// Type for task data when inserting
interface TaskInsert {
  user_id: string
  title: string
  description: string
  deadline: string
  scheduled_start?: string
  duration_minutes: number
  priority: number
  energy_level: string
  category: string
  tags: string[]
  status: string
  is_auto_scheduled: boolean
}

interface HabitSchedulingOptions {
  habit: Habit
  userId: string
  forDate: Date
  supabase: SupabaseClientType
}

interface ScheduledHabitTask {
  taskId: string
  habitId: string
  scheduledDate: string
}

// Day name mapping for weeklyPlan lookup
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * Variation templates to keep tasks fresh and engaging
 */
const TASK_TITLE_VARIATIONS = [
  (action: string, habitName: string) => action,
  (action: string, habitName: string) => `${habitName}: ${action}`,
  (action: string, habitName: string) => `Today's ${habitName.toLowerCase()} focus: ${action.toLowerCase()}`,
]

const MOTIVATION_PREFIXES = [
  "🎯 ",
  "✨ ",
  "💪 ",
  "🚀 ",
  "⭐ ",
  "🔥 ",
]

/**
 * Gets the action for a specific day from the habit's Atomic Habits plan
 */
function getActionForDay(plan: HabitPlan | undefined, dayOfWeek: number, habitName: string): { action: string; time: string } | null {
  if (!plan?.weeklyPlan || plan.weeklyPlan.length === 0) {
    return null
  }

  const dayName = DAY_NAMES[dayOfWeek]

  // Find exact match for day
  const dayPlan = plan.weeklyPlan.find(
    p => p.day.toLowerCase() === dayName.toLowerCase()
  )

  if (dayPlan) {
    return { action: dayPlan.action, time: dayPlan.time }
  }

  // Fallback: use cycling through available actions for variety
  const planIndex = dayOfWeek % plan.weeklyPlan.length
  return {
    action: plan.weeklyPlan[planIndex].action,
    time: plan.weeklyPlan[planIndex].time
  }
}

/**
 * Generates a varied task title from the Atomic Habits plan
 */
function generateTaskTitle(habit: Habit, action: string, dateVariation: number): string {
  const variationIndex = dateVariation % TASK_TITLE_VARIATIONS.length
  const prefixIndex = dateVariation % MOTIVATION_PREFIXES.length

  const baseTitle = TASK_TITLE_VARIATIONS[variationIndex](action, habit.name)

  // Add motivational prefix occasionally (every 3rd day)
  if (dateVariation % 3 === 0) {
    return `${MOTIVATION_PREFIXES[prefixIndex]}${baseTitle}`
  }

  return baseTitle
}

/**
 * Generates an actionable description using Atomic Habits strategies
 */
function generateTaskDescription(habit: Habit, action: string, dayOfWeek: number): string {
  const plan = habit.plan
  const parts: string[] = []

  // Primary action
  parts.push(`**Today's Action:** ${action}`)

  if (plan?.atomicHabitsStrategy) {
    const strategy = plan.atomicHabitsStrategy

    // Rotate which strategy tip to show based on day (keeps it fresh)
    const tipIndex = dayOfWeek % 4

    switch (tipIndex) {
      case 0:
        // Make it Obvious
        if (strategy.makeItObvious?.cue) {
          parts.push(`\n**Cue:** ${strategy.makeItObvious.cue}`)
        }
        if (strategy.makeItObvious?.habitStacking) {
          parts.push(`**Stack with:** ${strategy.makeItObvious.habitStacking}`)
        }
        break

      case 1:
        // Make it Attractive
        if (strategy.makeItAttractive?.temptationBundling) {
          parts.push(`\n**Pair with:** ${strategy.makeItAttractive.temptationBundling}`)
        }
        if (strategy.makeItAttractive?.motivation) {
          parts.push(`**Motivation:** ${strategy.makeItAttractive.motivation}`)
        }
        break

      case 2:
        // Make it Easy
        if (strategy.makeItEasy?.twoMinuteRule) {
          parts.push(`\n**Quick start:** ${strategy.makeItEasy.twoMinuteRule}`)
        }
        if (strategy.makeItEasy?.environmentDesign) {
          parts.push(`**Setup tip:** ${strategy.makeItEasy.environmentDesign}`)
        }
        break

      case 3:
        // Make it Satisfying
        if (strategy.makeItSatisfying?.immediateReward) {
          parts.push(`\n**Reward yourself:** ${strategy.makeItSatisfying.immediateReward}`)
        }
        break
    }
  }

  // Add a rotating tip for success
  if (plan?.tipsForSuccess && plan.tipsForSuccess.length > 0) {
    const tipIndex = dayOfWeek % plan.tipsForSuccess.length
    parts.push(`\n💡 **Tip:** ${plan.tipsForSuccess[tipIndex]}`)
  }

  // Fallback if no plan exists
  if (parts.length === 1) {
    parts.push(`\nComplete your "${habit.name}" habit today.`)
    if (habit.description) {
      parts.push(habit.description)
    }
  }

  return parts.join('\n')
}

/**
 * Determines if a habit should be scheduled for a given date based on its frequency
 */
export function shouldScheduleHabitForDate(habit: Habit, date: Date): boolean {
  if (!habit.isActive || !habit.autoSchedule) return false

  const dayOfWeek = date.getDay()
  const dateStr = date.toISOString().split('T')[0]

  // Check if date is within habit's active range
  if (habit.startDate && dateStr < habit.startDate) return false
  if (habit.endDate && dateStr > habit.endDate) return false

  switch (habit.frequency) {
    case 'daily':
      return true

    case 'weekly':
      // Check frequencyConfig for specific days
      const weeklyDays = (habit.frequencyConfig?.days as number[]) || [1, 2, 3, 4, 5]
      return weeklyDays.includes(dayOfWeek)

    case 'custom':
      // Custom frequency - check interval or specific dates
      const config = habit.frequencyConfig
      if (config?.interval && config?.unit) {
        const startDate = new Date(habit.startDate)
        const daysDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        const interval = config.interval as number
        const unit = config.unit as string

        if (unit === 'days') return daysDiff % interval === 0
        if (unit === 'weeks') return daysDiff % (interval * 7) === 0
      }
      if (config?.specificDays && Array.isArray(config.specificDays)) {
        return (config.specificDays as number[]).includes(dayOfWeek)
      }
      return false

    default:
      return false
  }
}

/**
 * Calculates the preferred time for a habit based on its settings
 */
export function getPreferredTimeForHabit(habit: Habit): { startTime: string; endTime: string } {
  const duration = habit.durationMinutes || 15

  // Use reminder time if set
  if (habit.reminderTime) {
    const [hours, minutes] = habit.reminderTime.split(':').map(Number)
    const endMinutes = minutes + duration
    const endHours = hours + Math.floor(endMinutes / 60)
    const endMins = endMinutes % 60
    return {
      startTime: habit.reminderTime,
      endTime: `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`,
    }
  }

  // Use preferred time of day
  const timeRanges: Record<string, { start: string; end: string }> = {
    morning: { start: '07:00', end: '12:00' },
    afternoon: { start: '12:00', end: '17:00' },
    evening: { start: '17:00', end: '21:00' },
    anytime: { start: '09:00', end: '18:00' },
  }

  const range = timeRanges[habit.preferredTimeOfDay || 'anytime']

  // Return the start of the preferred range
  const [startH, startM] = range.start.split(':').map(Number)
  const endMinutes = startM + duration
  const endH = startH + Math.floor(endMinutes / 60)
  const endM = endMinutes % 60

  return {
    startTime: range.start,
    endTime: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
  }
}

/**
 * Creates a task from a habit for a specific date using the Atomic Habits plan
 */
export async function createTaskFromHabit(
  options: HabitSchedulingOptions
): Promise<ScheduledHabitTask | null> {
  const { habit, userId, forDate, supabase } = options

  if (!shouldScheduleHabitForDate(habit, forDate)) {
    return null
  }

  const dateStr = forDate.toISOString().split('T')[0]
  const dayOfWeek = forDate.getDay()
  const { startTime } = getPreferredTimeForHabit(habit)

  // Check if task already exists for this habit on this date
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingTask } = await (supabase as any)
    .from('tasks')
    .select('id')
    .eq('user_id', userId)
    .eq('category', `habit:${habit.id}`)
    .gte('deadline', `${dateStr}T00:00:00`)
    .lt('deadline', `${dateStr}T23:59:59`)
    .single() as { data: { id: string } | null }

  if (existingTask) {
    return {
      taskId: existingTask.id,
      habitId: habit.id,
      scheduledDate: dateStr,
    }
  }

  // Get action from Atomic Habits plan or use habit name
  const planAction = getActionForDay(habit.plan, dayOfWeek, habit.name)
  const action = planAction?.action || habit.name

  // Use variation based on date to keep tasks fresh
  const dateVariation = forDate.getDate() + forDate.getMonth()
  const taskTitle = generateTaskTitle(habit, action, dateVariation)
  const taskDescription = generateTaskDescription(habit, action, dayOfWeek)

  // Override time from plan if available
  let scheduledTime = startTime
  if (planAction?.time) {
    // Parse time like "7:00 AM" or "14:00"
    const timeMatch = planAction.time.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i)
    if (timeMatch) {
      let hours = parseInt(timeMatch[1])
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0
      const period = timeMatch[3]?.toUpperCase()

      if (period === 'PM' && hours < 12) hours += 12
      if (period === 'AM' && hours === 12) hours = 0

      scheduledTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    }
  }

  // Create the task with actionable content from Atomic Habits plan
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: task, error } = await (supabase as any)
    .from('tasks')
    .insert({
      user_id: userId,
      title: taskTitle,
      description: taskDescription,
      deadline: `${dateStr}T23:59:59`,
      scheduled_start: `${dateStr}T${scheduledTime}:00`,
      duration_minutes: habit.durationMinutes || 15,
      priority: habit.schedulingPriority || 3,
      energy_level: habit.energyLevel || 'medium',
      category: `habit:${habit.id}`,
      tags: ['habit', habit.category || 'general'].filter(Boolean),
      status: 'scheduled',
      is_auto_scheduled: true,
    })
    .select('id')
    .single() as { data: { id: string } | null; error: Error | null }

  if (error || !task) {
    console.error('Failed to create task from habit:', error)
    return null
  }

  return {
    taskId: task.id,
    habitId: habit.id,
    scheduledDate: dateStr,
  }
}

/**
 * Creates tasks for all auto-scheduled habits for a date range
 */
export async function scheduleHabitsForDateRange(
  userId: string,
  startDate: Date,
  endDate: Date,
  supabase: SupabaseClientType
): Promise<ScheduledHabitTask[]> {
  // Fetch all auto-scheduled habits
  const { data: habits, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('auto_schedule', true)

  if (error || !habits) {
    console.error('Failed to fetch habits for scheduling:', error)
    return []
  }

  const results: ScheduledHabitTask[] = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    for (const habitData of habits) {
      const habit = transformHabitFromDb(habitData)
      const result = await createTaskFromHabit({
        habit,
        userId,
        forDate: new Date(currentDate),
        supabase,
      })
      if (result) {
        results.push(result)
      }
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return results
}

/**
 * Marks a habit task as complete and records the habit completion
 */
export async function completeHabitTask(
  taskId: string,
  userId: string,
  supabase: SupabaseClientType
): Promise<boolean> {
  // Get the task to find the linked habit
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: task, error: taskError } = await (supabase as any)
    .from('tasks')
    .select('category, deadline')
    .eq('id', taskId)
    .eq('user_id', userId)
    .single() as { data: { category: string; deadline: string } | null; error: Error | null }

  if (taskError || !task) return false

  // Extract habit ID from category (format: "habit:{habitId}")
  const habitIdMatch = task.category?.match(/^habit:(.+)$/)
  if (!habitIdMatch) return false

  const habitId = habitIdMatch[1]
  const completedDate = task.deadline?.split('T')[0] || new Date().toISOString().split('T')[0]

  // Record habit completion
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: completionError } = await (supabase as any)
    .from('habit_completions')
    .upsert({
      habit_id: habitId,
      user_id: userId,
      completed_date: completedDate,
      completed_count: 1,
    }, {
      onConflict: 'habit_id,user_id,completed_date',
    })

  if (completionError) {
    console.error('Failed to record habit completion:', completionError)
    return false
  }

  // Update task status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('tasks')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('user_id', userId)

  return !updateError
}

/**
 * Transform database habit to Habit type
 */
function transformHabitFromDb(data: Record<string, unknown>): Habit {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    name: data.name as string,
    description: data.description as string | undefined,
    icon: data.icon as string,
    color: data.color as string,
    frequency: data.frequency as 'daily' | 'weekly' | 'custom',
    frequencyConfig: (data.frequency_config as Record<string, unknown>) || {},
    targetCount: data.target_count as number,
    reminderTime: data.reminder_time as string | undefined,
    reminderEnabled: data.reminder_enabled as boolean,
    startDate: data.start_date as string,
    endDate: data.end_date as string | undefined,
    isActive: data.is_active as boolean,
    category: data.category as string | undefined,
    plan: data.plan as HabitPlan | undefined,
    // Scheduling fields
    durationMinutes: data.duration_minutes as number | undefined,
    energyLevel: data.energy_level as 'low' | 'medium' | 'high' | undefined,
    autoSchedule: data.auto_schedule as boolean | undefined,
    preferredTimeOfDay: data.preferred_time_of_day as 'morning' | 'afternoon' | 'evening' | 'anytime' | undefined,
    schedulingPriority: data.scheduling_priority as number | undefined,
  }
}

/**
 * Updates existing scheduled tasks with content from a newly generated Atomic Habits plan.
 * This is called when a plan is generated or regenerated to refresh task descriptions.
 */
export async function updateScheduledTasksWithPlan(
  habit: Record<string, unknown>,
  userId: string,
  supabase: SupabaseClientType
): Promise<number> {
  // Get all pending/scheduled tasks for this habit
  const today = new Date().toISOString().split('T')[0]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tasks, error } = await (supabase as any)
    .from('tasks')
    .select('id, deadline, scheduled_start')
    .eq('user_id', userId)
    .eq('category', `habit:${habit.id}`)
    .in('status', ['pending', 'scheduled'])
    .gte('deadline', `${today}T00:00:00`) as {
      data: Array<{ id: string; deadline: string; scheduled_start: string }> | null
      error: Error | null
    }

  if (error || !tasks || tasks.length === 0) {
    return 0
  }

  // Transform the habit to proper type
  const transformedHabit = transformHabitFromDb(habit)
  let updatedCount = 0

  for (const task of tasks) {
    const taskDate = new Date(task.deadline || task.scheduled_start)
    const dayOfWeek = taskDate.getDay()
    const dateVariation = taskDate.getDate() + taskDate.getMonth()

    // Get the action for this day from the plan
    const planAction = getActionForDay(transformedHabit.plan, dayOfWeek, transformedHabit.name)
    const action = planAction?.action || transformedHabit.name

    // Generate updated title and description
    const taskTitle = generateTaskTitle(transformedHabit, action, dateVariation)
    const taskDescription = generateTaskDescription(transformedHabit, action, dayOfWeek)

    // Update the task
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('tasks')
      .update({
        title: taskTitle,
        description: taskDescription,
        updated_at: new Date().toISOString(),
      })
      .eq('id', task.id)
      .eq('user_id', userId)

    if (!updateError) {
      updatedCount++
    }
  }

  return updatedCount
}
