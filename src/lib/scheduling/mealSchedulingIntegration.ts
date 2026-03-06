/**
 * Meal Scheduling Integration
 *
 * Converts meal plans into scheduled tasks for meal prep and meal times.
 * This allows meals to appear in the calendar and be tracked as tasks.
 */

import { createClient } from '@supabase/supabase-js'
import type { MealPlan } from '@/types'

interface MealSchedulingOptions {
  mealPlan: MealPlan
  userId: string
  supabase: ReturnType<typeof createClient>
  userPreferences?: {
    preferredMealTimes?: {
      breakfast: string
      lunch: string
      dinner: string
    }
  }
}

interface ScheduledMealTasks {
  prepTaskId?: string
  mealTaskId?: string
  mealPlanId: string
  date: string
}

/**
 * Default meal times by meal type
 */
const DEFAULT_MEAL_TIMES: Record<string, string> = {
  breakfast: '08:00',
  lunch: '12:30',
  dinner: '18:30',
  snack: '15:00',
}

/**
 * Get the meal time for a meal plan based on type and preferences
 */
export function getMealTime(
  mealPlan: MealPlan,
  userPreferences?: MealSchedulingOptions['userPreferences']
): string {
  // Use explicit meal time if set
  if (mealPlan.mealTime) {
    return mealPlan.mealTime
  }

  // Use user preferences
  if (userPreferences?.preferredMealTimes) {
    const preferredTime = userPreferences.preferredMealTimes[
      mealPlan.mealType as keyof typeof userPreferences.preferredMealTimes
    ]
    if (preferredTime) return preferredTime
  }

  // Fall back to defaults
  return DEFAULT_MEAL_TIMES[mealPlan.mealType] || '12:00'
}

/**
 * Calculate prep start time based on meal time and prep/cook duration
 */
export function getPrepStartTime(mealPlan: MealPlan, mealTime: string): string {
  const totalPrepMinutes = (mealPlan.prepTimeMinutes || 0) + (mealPlan.cookTimeMinutes || 0)

  if (totalPrepMinutes === 0) return mealTime

  const [hours, minutes] = mealTime.split(':').map(Number)
  const mealMinutes = hours * 60 + minutes
  const prepStartMinutes = mealMinutes - totalPrepMinutes - 15 // 15 min buffer

  const prepHours = Math.floor(prepStartMinutes / 60)
  const prepMins = prepStartMinutes % 60

  return `${String(Math.max(0, prepHours)).padStart(2, '0')}:${String(Math.max(0, prepMins)).padStart(2, '0')}`
}

/**
 * Create a prep task for a meal plan
 */
async function createPrepTask(
  options: MealSchedulingOptions,
  mealTime: string
): Promise<string | null> {
  const { mealPlan, userId, supabase } = options

  const totalPrepMinutes = (mealPlan.prepTimeMinutes || 0) + (mealPlan.cookTimeMinutes || 0)
  if (totalPrepMinutes === 0) return null

  const prepStartTime = getPrepStartTime(mealPlan, mealTime)
  const scheduledStart = `${mealPlan.date}T${prepStartTime}:00`

  // Calculate end time
  const [startH, startM] = prepStartTime.split(':').map(Number)
  const endMinutes = startH * 60 + startM + totalPrepMinutes
  const endH = Math.floor(endMinutes / 60)
  const endM = endMinutes % 60
  const scheduledEnd = `${mealPlan.date}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      title: `Prepare: ${mealPlan.name}`,
      description: `Prep time: ${mealPlan.prepTimeMinutes || 0}min, Cook time: ${mealPlan.cookTimeMinutes || 0}min`,
      deadline: `${mealPlan.date}T${mealTime}:00`,
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      duration_minutes: totalPrepMinutes,
      priority: 3,
      energy_level: 'medium',
      category: `meal-prep:${mealPlan.id}`,
      tags: ['meal-prep', mealPlan.mealType],
      status: 'scheduled',
      is_auto_scheduled: true,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create meal prep task:', error)
    return null
  }

  return task.id
}

/**
 * Create a meal time task/reminder for a meal plan
 */
async function createMealTask(
  options: MealSchedulingOptions,
  mealTime: string
): Promise<string | null> {
  const { mealPlan, userId, supabase } = options

  const scheduledStart = `${mealPlan.date}T${mealTime}:00`

  // Meal duration (30 min default)
  const mealDuration = 30
  const [startH, startM] = mealTime.split(':').map(Number)
  const endMinutes = startH * 60 + startM + mealDuration
  const endH = Math.floor(endMinutes / 60)
  const endM = endMinutes % 60
  const scheduledEnd = `${mealPlan.date}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`

  // Build description with nutritional info
  let description = `${mealPlan.mealType.charAt(0).toUpperCase() + mealPlan.mealType.slice(1)}: ${mealPlan.name}`
  if (mealPlan.calories) {
    description += ` (${mealPlan.calories} cal)`
  }
  if (mealPlan.description) {
    description += `\n${mealPlan.description}`
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      title: `${mealPlan.mealType.charAt(0).toUpperCase() + mealPlan.mealType.slice(1)}: ${mealPlan.name}`,
      description,
      deadline: `${mealPlan.date}T${mealTime}:00`,
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      duration_minutes: mealDuration,
      priority: 4, // Lower priority since it's a reminder
      energy_level: 'low',
      category: `meal:${mealPlan.id}`,
      tags: ['meal', mealPlan.mealType],
      status: 'scheduled',
      is_auto_scheduled: true,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create meal task:', error)
    return null
  }

  return task.id
}

/**
 * Schedule tasks for a meal plan based on its settings
 */
export async function scheduleMealPlan(
  options: MealSchedulingOptions
): Promise<ScheduledMealTasks | null> {
  const { mealPlan, userId, supabase, userPreferences } = options

  // Skip if no scheduling requested
  if (!mealPlan.autoSchedulePrep && !mealPlan.autoScheduleMeal) {
    return null
  }

  const mealTime = getMealTime(mealPlan, userPreferences)
  const result: ScheduledMealTasks = {
    mealPlanId: mealPlan.id,
    date: mealPlan.date,
  }

  // Create prep task if requested
  if (mealPlan.autoSchedulePrep) {
    const prepTaskId = await createPrepTask(options, mealTime)
    if (prepTaskId) {
      result.prepTaskId = prepTaskId

      // Update meal plan with task reference
      await supabase
        .from('meal_plans')
        .update({ prep_scheduled_task_id: prepTaskId })
        .eq('id', mealPlan.id)
    }
  }

  // Create meal task if requested
  if (mealPlan.autoScheduleMeal) {
    const mealTaskId = await createMealTask(options, mealTime)
    if (mealTaskId) {
      result.mealTaskId = mealTaskId

      // Update meal plan with task reference
      await supabase
        .from('meal_plans')
        .update({ meal_scheduled_task_id: mealTaskId })
        .eq('id', mealPlan.id)
    }
  }

  return result
}

/**
 * Schedule all meal plans for a date range that have auto-scheduling enabled
 */
export async function scheduleMealPlansForDateRange(
  userId: string,
  startDate: string,
  endDate: string,
  supabase: ReturnType<typeof createClient>,
  userPreferences?: MealSchedulingOptions['userPreferences']
): Promise<ScheduledMealTasks[]> {
  // Fetch meal plans with auto-scheduling enabled
  const { data: mealPlans, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .or('auto_schedule_prep.eq.true,auto_schedule_meal.eq.true')

  if (error || !mealPlans) {
    console.error('Failed to fetch meal plans for scheduling:', error)
    return []
  }

  const results: ScheduledMealTasks[] = []

  for (const mealData of mealPlans) {
    const mealPlan = transformMealPlanFromDb(mealData)
    const result = await scheduleMealPlan({
      mealPlan,
      userId,
      supabase,
      userPreferences,
    })
    if (result) {
      results.push(result)
    }
  }

  return results
}

/**
 * Remove scheduled tasks when a meal plan is deleted or scheduling is disabled
 */
export async function unscheduleMealPlan(
  mealPlanId: string,
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  // Get the meal plan to find linked tasks
  const { data: mealPlan } = await supabase
    .from('meal_plans')
    .select('prep_scheduled_task_id, meal_scheduled_task_id')
    .eq('id', mealPlanId)
    .eq('user_id', userId)
    .single()

  if (!mealPlan) return

  // Delete linked tasks
  const taskIds = [mealPlan.prep_scheduled_task_id, mealPlan.meal_scheduled_task_id].filter(Boolean)

  if (taskIds.length > 0) {
    await supabase
      .from('tasks')
      .delete()
      .in('id', taskIds)
      .eq('user_id', userId)
  }

  // Clear references in meal plan
  await supabase
    .from('meal_plans')
    .update({
      prep_scheduled_task_id: null,
      meal_scheduled_task_id: null,
    })
    .eq('id', mealPlanId)
}

/**
 * Transform database meal plan to MealPlan type
 */
function transformMealPlanFromDb(data: Record<string, unknown>): MealPlan {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    date: data.date as string,
    mealType: data.meal_type as 'breakfast' | 'lunch' | 'dinner' | 'snack',
    name: data.name as string,
    description: data.description as string | undefined,
    recipeUrl: data.recipe_url as string | undefined,
    calories: data.calories as number | undefined,
    prepTimeMinutes: data.prep_time_minutes as number | undefined,
    cookTimeMinutes: data.cook_time_minutes as number | undefined,
    servings: data.servings as number,
    ingredients: (data.ingredients as MealPlan['ingredients']) || [],
    instructions: (data.instructions as string[]) || [],
    nutritionalInfo: (data.nutritional_info as MealPlan['nutritionalInfo']) || {},
    imageUrl: data.image_url as string | undefined,
    tags: (data.tags as string[]) || [],
    isFavorite: data.is_favorite as boolean,
    // Scheduling fields
    autoSchedulePrep: data.auto_schedule_prep as boolean | undefined,
    autoScheduleMeal: data.auto_schedule_meal as boolean | undefined,
    mealTime: data.meal_time as string | undefined,
    prepScheduledTaskId: data.prep_scheduled_task_id as string | undefined,
    mealScheduledTaskId: data.meal_scheduled_task_id as string | undefined,
  }
}
