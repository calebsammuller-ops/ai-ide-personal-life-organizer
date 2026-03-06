import { SupabaseClient } from '@supabase/supabase-js'
import { addExplicitMemory } from './learningPipeline'
import { parseDateTime as parseDateTimeUtil } from '@/lib/dateParser'
import type { UserMemory, LearnedBehavior } from '@/types'
import { generateExcelGanttChart, generateExcelSpreadsheet, generateCSV, generatePDFReport } from './fileGenerator'

export interface ActionResult {
  success: boolean
  message: string
  data?: Record<string, unknown>
}

export interface ActionPayload {
  [key: string]: unknown
}

export async function executeIntent(
  intent: string,
  entities: ActionPayload,
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  switch (intent) {
    case 'schedule_event':
      return handleScheduleEvent(entities, userId, supabase)
    case 'complete_habit':
      return handleCompleteHabit(entities, userId, supabase)
    case 'create_meal':
      return handleCreateMeal(entities, userId, supabase)
    case 'capture_thought':
      return handleCaptureThought(entities, userId, supabase)
    case 'generate_daily_plan':
      return handleGeneratePlan(userId, supabase)
    case 'remember_fact':
      return handleRememberFact(entities, userId, supabase)
    case 'cancel_event':
      return handleCancelEvent(entities, userId, supabase)
    case 'update_habit':
      return handleUpdateHabit(entities, userId, supabase)
    case 'search_memories':
      return handleSearchMemories(entities, userId, supabase)
    case 'get_morning_brief':
      return handleMorningBrief(userId, supabase)
    case 'log_food':
      return handleLogFood(entities, userId, supabase)
    case 'schedule_task':
      return handleScheduleTask(entities, userId, supabase)
    case 'create_focus_time':
      return handleCreateFocusTime(entities, userId, supabase)
    case 'reschedule_task':
      return handleRescheduleTask(entities, userId, supabase)
    case 'complete_task':
      return handleCompleteTask(entities, userId, supabase)
    case 'optimize_schedule':
      return handleOptimizeSchedule(userId, supabase)
    case 'generate_file':
      return handleGenerateFile(entities, userId, supabase)
    case 'create_project':
      return handleCreateProject(entities, userId, supabase)
    case 'create_habit':
      return handleCreateHabit(entities, userId, supabase)
    case 'create_tasks':
      return handleCreateTasks(entities, userId, supabase)
    case 'schedule_plan':
      return handleSchedulePlan(entities, userId, supabase)
    case 'start_timer':
      return handleStartTimer(entities, userId, supabase)
    case 'stop_timer':
      return handleStopTimer(userId, supabase)
    case 'create_document':
      return handleCreateDocument(entities, userId, supabase)
    case 'search_everything':
      return handleSearchEverything(entities, userId, supabase)
    case 'create_automation':
      return handleCreateAutomation(entities, userId, supabase)
    case 'learn_behavior':
      return handleLearnBehavior(entities, userId, supabase)
    case 'solve_math':
      return handleSolveMath(entities, userId)
    case 'practice_math':
      return handlePracticeMath(entities)
    case 'math_progress':
      return handleMathProgress(userId, supabase)
    case 'add_shopping_item':
      return handleAddShoppingItem(entities, userId, supabase)
    case 'create_knowledge_note':
      return handleCreateKnowledgeNote(entities, userId, supabase)
    case 'link_knowledge_notes':
      return handleLinkKnowledgeNotes(entities, userId, supabase)
    default:
      return { success: false, message: `Unknown intent: ${intent}` }
  }
}

async function handleScheduleEvent(
  entities: ActionPayload,
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const { title, date, startTime, endTime, description, location } = entities

  if (!title || !date || !startTime) {
    return {
      success: false,
      message: 'Missing required fields: title, date, and startTime are required',
    }
  }

  // Get user's primary calendar
  const { data: calendars } = await supabase
    .from('calendars')
    .select('id')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .single()

  const calendarId = calendars?.id

  // Parse the date and time
  const startDateTime = parseDateTime(date as string, startTime as string)
  const endDateTime = endTime
    ? parseDateTime(date as string, endTime as string)
    : new Date(startDateTime.getTime() + 60 * 60 * 1000) // Default 1 hour

  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      user_id: userId,
      calendar_id: calendarId,
      title: title as string,
      description: description as string | undefined,
      location: location as string | undefined,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      all_day: false,
      status: 'confirmed',
      priority: 3,
      reminders: [{ minutes: 15 }],
      is_auto_scheduled: false,
      metadata: {},
    })
    .select()
    .single()

  if (error) {
    return { success: false, message: `Failed to create event: ${error.message}` }
  }

  return {
    success: true,
    message: `Event "${title}" scheduled for ${formatDateTime(startDateTime)}`,
    data: { eventId: data.id },
  }
}

async function handleCompleteHabit(
  entities: ActionPayload,
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const { habitName, habitId, date } = entities
  const completionDate = date ? String(date) : new Date().toISOString().split('T')[0]

  let targetHabitId = habitId as string | undefined

  // If no habitId provided, search by name
  if (!targetHabitId && habitName) {
    const { data: habits } = await supabase
      .from('habits')
      .select('id, name')
      .eq('user_id', userId)
      .eq('is_active', true)
      .ilike('name', `%${habitName}%`)
      .limit(1)

    if (!habits || habits.length === 0) {
      return { success: false, message: `No habit found matching "${habitName}"` }
    }
    targetHabitId = habits[0].id
  }

  if (!targetHabitId) {
    return { success: false, message: 'No habit specified' }
  }

  // Check if already completed today
  const { data: existing } = await supabase
    .from('habit_completions')
    .select('id, completed_count')
    .eq('habit_id', targetHabitId)
    .eq('user_id', userId)
    .eq('completed_date', completionDate)
    .single()

  if (existing) {
    // Update count
    const { error } = await supabase
      .from('habit_completions')
      .update({ completed_count: existing.completed_count + 1 })
      .eq('id', existing.id)

    if (error) {
      return { success: false, message: `Failed to update habit: ${error.message}` }
    }

    return {
      success: true,
      message: `Habit marked complete (${existing.completed_count + 1} times today)`,
      data: { completionId: existing.id },
    }
  }

  // Create new completion
  const { data, error } = await supabase
    .from('habit_completions')
    .insert({
      habit_id: targetHabitId,
      user_id: userId,
      completed_date: completionDate,
      completed_count: 1,
    })
    .select()
    .single()

  if (error) {
    return { success: false, message: `Failed to complete habit: ${error.message}` }
  }

  return {
    success: true,
    message: 'Habit marked as complete!',
    data: { completionId: data.id },
  }
}

async function handleCreateMeal(
  entities: ActionPayload,
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const { name, mealType, date, description, calories, ingredients } = entities

  // Be flexible — mealType can default to 'meal' if missing
  const resolvedName = String(name || 'Meal')
  const resolvedType = String(mealType || 'meal')
  const mealDate = date ? String(date) : new Date().toISOString().split('T')[0]
  const ingredientList = Array.isArray(ingredients) ? ingredients as string[] : []

  const { data, error } = await (supabase as any)
    .from('meal_plans')
    .insert({
      user_id: userId,
      date: mealDate,
      meal_type: resolvedType,
      name: resolvedName,
      description: description ? String(description) : null,
      calories: calories ? Number(calories) : null,
      servings: 1,
      ingredients: ingredientList,
      instructions: [],
      nutritional_info: calories ? { calories: Number(calories) } : {},
      tags: [],
      is_favorite: false,
    })
    .select()
    .single()

  if (error) {
    return { success: false, message: `Failed to create meal: ${error.message}` }
  }

  // Auto-add ingredients to shopping list if provided
  if (ingredientList.length > 0) {
    const shoppingItems = ingredientList.map((ing: string) => ({
      user_id: userId,
      name: ing,
      category: 'general',
      is_checked: false,
      meal_plan_id: data.id,
    }))
    await (supabase as any).from('shopping_list_items').insert(shoppingItems)
  }

  const shoppingMsg = ingredientList.length > 0
    ? ` Ingredients added to your shopping list.`
    : ''

  return {
    success: true,
    message: `${resolvedType} "${resolvedName}" added to your meal plan for ${mealDate}.${shoppingMsg}`,
    data: { mealId: data.id, ingredientsAdded: ingredientList.length },
  }
}

async function handleCaptureThought(
  entities: ActionPayload,
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const { content, category, priority } = entities

  if (!content) {
    return { success: false, message: 'No thought content provided' }
  }

  const { data, error } = await supabase
    .from('thoughts')
    .insert({
      user_id: userId,
      raw_content: content as string,
      category: (category as string) || 'note',
      priority: priority ? Number(priority) : 3,
      tags: [],
      extracted_tasks: [],
      extracted_events: [],
      is_processed: false,
      is_archived: false,
    })
    .select()
    .single()

  if (error) {
    return { success: false, message: `Failed to capture thought: ${error.message}` }
  }

  return {
    success: true,
    message: 'Thought captured successfully!',
    data: { thoughtId: data.id },
  }
}

async function handleGeneratePlan(
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const today = new Date().toISOString().split('T')[0]

  // Check if plan exists
  const { data: existingPlan } = await supabase
    .from('daily_plans')
    .select('id')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  if (existingPlan) {
    return {
      success: true,
      message: 'Your daily plan for today is already generated. Check the Daily Plan section.',
      data: { planId: existingPlan.id, alreadyExists: true },
    }
  }

  return {
    success: true,
    message: 'To generate your daily plan, please visit the Daily Plan section and click "Generate Plan".',
    data: { redirectTo: '/daily-plan' },
  }
}

function parseDateTime(dateStr: string, timeStr: string): Date {
  return parseDateTimeUtil(dateStr, timeStr)
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

async function handleRememberFact(
  entities: ActionPayload,
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const { fact, category } = entities

  if (!fact) {
    return { success: false, message: 'Please tell me what you would like me to remember.' }
  }

  const validCategories: UserMemory['category'][] = [
    'personal', 'preference', 'routine', 'goal', 'lifestyle', 'health', 'work'
  ]
  const memoryCategory = validCategories.includes(category as UserMemory['category'])
    ? (category as UserMemory['category'])
    : 'personal'

  try {
    const memory = await addExplicitMemory(
      userId,
      fact as string,
      memoryCategory,
      supabase
    )

    return {
      success: true,
      message: `Got it! I'll remember: "${fact}"`,
      data: { memoryId: memory.id },
    }
  } catch (error) {
    console.error('Failed to save memory:', error)
    return {
      success: false,
      message: 'Sorry, I had trouble saving that. Please try again.',
    }
  }
}

async function handleCancelEvent(
  entities: ActionPayload,
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const { eventId, eventTitle, date } = entities

  let targetEventId = eventId as string | undefined

  // If no eventId, search by title
  if (!targetEventId && eventTitle) {
    let query = supabase
      .from('calendar_events')
      .select('id, title, start_time')
      .eq('user_id', userId)
      .neq('status', 'cancelled')
      .ilike('title', `%${eventTitle}%`)

    // If date provided, filter by date
    if (date) {
      const searchDate = date === 'today'
        ? new Date().toISOString().split('T')[0]
        : date === 'tomorrow'
        ? new Date(Date.now() + 86400000).toISOString().split('T')[0]
        : String(date)

      query = query.gte('start_time', `${searchDate}T00:00:00`)
        .lt('start_time', `${searchDate}T23:59:59`)
    }

    const { data: events } = await query.order('start_time', { ascending: true }).limit(1)

    if (!events || events.length === 0) {
      return { success: false, message: `No event found matching "${eventTitle}"` }
    }
    targetEventId = events[0].id
  }

  if (!targetEventId) {
    return { success: false, message: 'Please specify which event to cancel' }
  }

  const { data, error } = await supabase
    .from('calendar_events')
    .update({ status: 'cancelled' })
    .eq('id', targetEventId)
    .eq('user_id', userId)
    .select('title')
    .single()

  if (error) {
    return { success: false, message: `Failed to cancel event: ${error.message}` }
  }

  return {
    success: true,
    message: `Event "${data.title}" has been cancelled`,
    data: { eventId: targetEventId },
  }
}

async function handleUpdateHabit(
  entities: ActionPayload,
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const { habitName, habitId, newName, reminderTime, reminderEnabled, isActive, projectId } = entities

  let targetHabitId = habitId as string | undefined

  // Find habit by name if no ID
  if (!targetHabitId && habitName) {
    const { data: habits } = await supabase
      .from('habits')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', `%${habitName}%`)
      .limit(1)

    if (!habits || habits.length === 0) {
      return { success: false, message: `No habit found matching "${habitName}"` }
    }
    targetHabitId = habits[0].id
  }

  if (!targetHabitId) {
    return { success: false, message: 'Please specify which habit to update' }
  }

  // Build update object
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (newName) updates.name = newName
  if (reminderTime !== undefined) updates.reminder_time = reminderTime
  if (reminderEnabled !== undefined) updates.reminder_enabled = reminderEnabled
  if (isActive !== undefined) updates.is_active = isActive
  if (projectId !== undefined) updates.project_id = projectId || null

  if (Object.keys(updates).length === 1) {
    return { success: false, message: 'No updates specified' }
  }

  const { data, error } = await supabase
    .from('habits')
    .update(updates)
    .eq('id', targetHabitId)
    .eq('user_id', userId)
    .select('name')
    .single()

  if (error) {
    return { success: false, message: `Failed to update habit: ${error.message}` }
  }

  const linkedMsg = projectId ? ` and linked to project` : ''
  return {
    success: true,
    message: `Habit "${data.name}" has been updated${linkedMsg}`,
    data: { habitId: targetHabitId },
  }
}

async function handleSearchMemories(
  entities: ActionPayload,
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const { query, category } = entities

  // Get user's memories
  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('learned_patterns')
    .eq('user_id', userId)
    .single()

  const memories: UserMemory[] = prefs?.learned_patterns?.userMemories || []

  if (memories.length === 0) {
    return {
      success: true,
      message: "I don't have any memories saved about you yet.",
      data: { memories: [] },
    }
  }

  // Filter memories
  let filtered = memories

  if (category) {
    filtered = filtered.filter(m => m.category === category)
  }

  if (query) {
    const searchTerms = String(query).toLowerCase().split(' ')
    filtered = filtered.filter(m =>
      searchTerms.some(term => m.content.toLowerCase().includes(term))
    )
  }

  if (filtered.length === 0) {
    return {
      success: true,
      message: query
        ? `I couldn't find any memories matching "${query}"`
        : `I don't have any memories in the ${category} category`,
      data: { memories: [] },
    }
  }

  // Sort by confidence and return top 5
  filtered.sort((a, b) => b.confidence - a.confidence)
  const topMemories = filtered.slice(0, 5)

  const memoryList = topMemories.map(m => `• ${m.content}`).join('\n')

  return {
    success: true,
    message: `Here's what I remember:\n${memoryList}`,
    data: { memories: topMemories, count: filtered.length },
  }
}

async function handleMorningBrief(
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Fetch today's data in parallel
  const [eventsResult, habitsResult, mealsResult, thoughtsResult] = await Promise.all([
    supabase
      .from('calendar_events')
      .select('title, start_time, end_time, location')
      .eq('user_id', userId)
      .gte('start_time', `${todayStr}T00:00:00`)
      .lt('start_time', `${todayStr}T23:59:59`)
      .neq('status', 'cancelled')
      .order('start_time', { ascending: true }),
    supabase
      .from('habits')
      .select('id, name')
      .eq('user_id', userId)
      .eq('is_active', true),
    supabase
      .from('meal_plans')
      .select('name, meal_type')
      .eq('user_id', userId)
      .eq('date', todayStr),
    supabase
      .from('thoughts')
      .select('id')
      .eq('user_id', userId)
      .eq('is_processed', false)
      .eq('is_archived', false),
  ])

  const events = eventsResult.data || []
  const habits = habitsResult.data || []
  const meals = mealsResult.data || []
  const pendingThoughts = thoughtsResult.data || []

  // Check habit completions for today
  const { data: completions } = await supabase
    .from('habit_completions')
    .select('habit_id')
    .eq('user_id', userId)
    .eq('completed_date', todayStr)

  const completedHabitIds = new Set((completions || []).map(c => c.habit_id))
  const pendingHabits = habits.filter(h => !completedHabitIds.has(h.id))

  // Build the brief
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' })
  const dateFormatted = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  let brief = `Good morning! Here's your brief for ${dayName}, ${dateFormatted}:\n\n`

  // Events section
  if (events.length > 0) {
    brief += `📅 **${events.length} event${events.length > 1 ? 's' : ''} today:**\n`
    events.slice(0, 5).forEach(e => {
      const time = new Date(e.start_time).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      })
      brief += `  • ${time} - ${e.title}${e.location ? ` (${e.location})` : ''}\n`
    })
    if (events.length > 5) {
      brief += `  ...and ${events.length - 5} more\n`
    }
    brief += '\n'
  } else {
    brief += `📅 No events scheduled for today.\n\n`
  }

  // Habits section
  if (pendingHabits.length > 0) {
    brief += `✅ **${pendingHabits.length} habit${pendingHabits.length > 1 ? 's' : ''} to complete:**\n`
    pendingHabits.slice(0, 5).forEach(h => {
      brief += `  • ${h.name}\n`
    })
    brief += '\n'
  } else if (habits.length > 0) {
    brief += `✅ All ${habits.length} habits completed! Great job!\n\n`
  }

  // Meals section
  if (meals.length > 0) {
    brief += `🍽️ **Meals planned:**\n`
    meals.forEach(m => {
      brief += `  • ${m.meal_type}: ${m.name}\n`
    })
    brief += '\n'
  }

  // Pending thoughts
  if (pendingThoughts.length > 0) {
    brief += `💭 You have ${pendingThoughts.length} unprocessed thought${pendingThoughts.length > 1 ? 's' : ''} to review.\n\n`
  }

  brief += `Have a productive day!`

  return {
    success: true,
    message: brief,
    data: {
      eventCount: events.length,
      pendingHabitCount: pendingHabits.length,
      mealCount: meals.length,
      pendingThoughtCount: pendingThoughts.length,
    },
  }
}

async function handleLogFood(
  entities: ActionPayload,
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const { foodName, calories, protein, carbs, fat, fiber, mealType } = entities

  if (!foodName) {
    return { success: false, message: 'Please specify what food to log' }
  }

  const today = new Date().toISOString().split('T')[0]
  const type = mealType || 'snack'

  // Create a meal plan entry
  const { data, error } = await supabase
    .from('meal_plans')
    .insert({
      user_id: userId,
      date: today,
      meal_type: type as string,
      name: foodName as string,
      calories: calories ? Number(calories) : undefined,
      servings: 1,
      ingredients: [],
      instructions: [],
      nutritional_info: {
        calories: calories ? Number(calories) : undefined,
        protein: protein ? Number(protein) : undefined,
        carbs: carbs ? Number(carbs) : undefined,
        fat: fat ? Number(fat) : undefined,
        fiber: fiber ? Number(fiber) : undefined,
      },
      tags: ['quick-log'],
      is_favorite: false,
    })
    .select()
    .single()

  if (error) {
    return { success: false, message: `Failed to log food: ${error.message}` }
  }

  let message = `Logged "${foodName}" as ${type}`
  if (calories) {
    message += ` (${calories} cal)`
  }

  return {
    success: true,
    message,
    data: { mealId: data.id },
  }
}

// --- Scheduling Intent Handlers ---

async function handleScheduleTask(
  entities: ActionPayload,
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const { title, description, deadline, duration, priority, energyLevel, category } = entities

  if (!title) {
    return { success: false, message: 'Please provide a title for the task' }
  }

  // Parse duration (in minutes)
  let durationMinutes = 30
  if (duration) {
    const durationStr = String(duration).toLowerCase()
    if (durationStr.includes('hour')) {
      const hours = parseInt(durationStr) || 1
      durationMinutes = hours * 60
    } else if (durationStr.includes('min')) {
      durationMinutes = parseInt(durationStr) || 30
    } else {
      durationMinutes = parseInt(durationStr) || 30
    }
  }

  // Parse deadline
  let deadlineDate: string | undefined
  if (deadline) {
    const deadlineStr = String(deadline).toLowerCase()
    const today = new Date()

    if (deadlineStr === 'today') {
      deadlineDate = `${today.toISOString().split('T')[0]}T23:59:59`
    } else if (deadlineStr === 'tomorrow') {
      const tomorrow = new Date(today.getTime() + 86400000)
      deadlineDate = `${tomorrow.toISOString().split('T')[0]}T23:59:59`
    } else if (deadlineStr.includes('next')) {
      // Simple parsing for "next Monday", etc.
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const targetDay = days.findIndex(d => deadlineStr.includes(d))
      if (targetDay >= 0) {
        const currentDay = today.getDay()
        const daysUntil = (targetDay - currentDay + 7) % 7 || 7
        const target = new Date(today.getTime() + daysUntil * 86400000)
        deadlineDate = `${target.toISOString().split('T')[0]}T23:59:59`
      }
    } else {
      deadlineDate = deadline as string
    }
  }

  // Parse priority (1-5, default 3)
  let taskPriority = 3
  if (priority) {
    const prioStr = String(priority).toLowerCase()
    if (prioStr === 'urgent' || prioStr === 'critical' || prioStr === '1') taskPriority = 1
    else if (prioStr === 'high' || prioStr === '2') taskPriority = 2
    else if (prioStr === 'medium' || prioStr === '3') taskPriority = 3
    else if (prioStr === 'low' || prioStr === '4') taskPriority = 4
    else if (prioStr === 'lowest' || prioStr === '5') taskPriority = 5
    else taskPriority = parseInt(prioStr) || 3
  }

  // Create the task
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      title: title as string,
      description: description as string | undefined,
      deadline: deadlineDate,
      duration_minutes: durationMinutes,
      priority: taskPriority,
      energy_level: energyLevel as string | undefined,
      category: category as string | undefined,
      tags: [],
      status: 'pending',
      is_auto_scheduled: true,
      reschedule_count: 0,
    })
    .select()
    .single()

  if (error) {
    return { success: false, message: `Failed to create task: ${error.message}` }
  }

  let message = `Task "${title}" created`
  if (deadlineDate) {
    const d = new Date(deadlineDate)
    message += ` with deadline ${d.toLocaleDateString()}`
  }
  message += '. It will be auto-scheduled to an optimal time slot.'

  return {
    success: true,
    message,
    data: { taskId: data.id },
  }
}

async function handleCreateFocusTime(
  entities: ActionPayload,
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const { startTime, endTime, title, days } = entities

  if (!startTime || !endTime) {
    return {
      success: false,
      message: 'Please specify start and end times for the focus block',
    }
  }

  // Parse days (default to weekdays)
  let daysOfWeek = [1, 2, 3, 4, 5]
  if (days) {
    const daysStr = String(days).toLowerCase()
    if (daysStr.includes('everyday') || daysStr.includes('every day')) {
      daysOfWeek = [0, 1, 2, 3, 4, 5, 6]
    } else if (daysStr.includes('weekend')) {
      daysOfWeek = [0, 6]
    } else if (daysStr.includes('weekday')) {
      daysOfWeek = [1, 2, 3, 4, 5]
    }
  }

  const { data, error } = await supabase
    .from('focus_blocks')
    .insert({
      user_id: userId,
      title: (title as string) || 'Focus Time',
      start_time: startTime as string,
      end_time: endTime as string,
      days_of_week: daysOfWeek,
      is_protected: true,
      allow_high_priority_override: false,
      buffer_minutes: 15,
      preferred_task_types: [],
      blocked_categories: ['meeting', 'call'],
      is_active: true,
      color: '#6366f1',
    })
    .select()
    .single()

  if (error) {
    return { success: false, message: `Failed to create focus block: ${error.message}` }
  }

  return {
    success: true,
    message: `Focus block "${title || 'Focus Time'}" created from ${startTime} to ${endTime}`,
    data: { focusBlockId: data.id },
  }
}

async function handleRescheduleTask(
  entities: ActionPayload,
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const { taskName, taskId, targetDate } = entities

  let targetTaskId = taskId as string | undefined

  // Find task by name if no ID
  if (!targetTaskId && taskName) {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('user_id', userId)
      .in('status', ['pending', 'scheduled'])
      .ilike('title', `%${taskName}%`)
      .limit(1)

    if (!tasks || tasks.length === 0) {
      return { success: false, message: `No task found matching "${taskName}"` }
    }
    targetTaskId = tasks[0].id
  }

  if (!targetTaskId) {
    return { success: false, message: 'Please specify which task to reschedule' }
  }

  // Clear current schedule
  const { data, error } = await supabase
    .from('tasks')
    .update({
      scheduled_start: null,
      scheduled_end: null,
      status: 'pending',
    })
    .eq('id', targetTaskId)
    .eq('user_id', userId)
    .select('title')
    .single()

  if (error) {
    return { success: false, message: `Failed to reschedule task: ${error.message}` }
  }

  return {
    success: true,
    message: `Task "${data.title}" has been unscheduled and will be auto-scheduled to a new optimal time`,
    data: { taskId: targetTaskId },
  }
}

async function handleCompleteTask(
  entities: ActionPayload,
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const { taskName, taskId } = entities

  let targetTaskId = taskId as string | undefined

  // Find task by name if no ID
  if (!targetTaskId && taskName) {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('user_id', userId)
      .in('status', ['pending', 'scheduled', 'in_progress'])
      .ilike('title', `%${taskName}%`)
      .limit(1)

    if (!tasks || tasks.length === 0) {
      return { success: false, message: `No active task found matching "${taskName}"` }
    }
    targetTaskId = tasks[0].id
  }

  if (!targetTaskId) {
    return { success: false, message: 'Please specify which task to complete' }
  }

  const { data, error } = await supabase
    .from('tasks')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', targetTaskId)
    .eq('user_id', userId)
    .select('title')
    .single()

  if (error) {
    return { success: false, message: `Failed to complete task: ${error.message}` }
  }

  return {
    success: true,
    message: `Great job! Task "${data.title}" marked as complete`,
    data: { taskId: targetTaskId },
  }
}

async function handleOptimizeSchedule(
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const today = new Date().toISOString().split('T')[0]

  // Get pending tasks count
  const { count: pendingCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'pending')

  // Get scheduled tasks count
  const { count: scheduledCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'scheduled')

  // Get focus blocks count
  const { count: focusCount } = await supabase
    .from('focus_blocks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true)

  let message = `Here's your scheduling overview:\n\n`
  message += `📋 **${pendingCount || 0}** pending tasks waiting to be scheduled\n`
  message += `📅 **${scheduledCount || 0}** tasks already scheduled\n`
  message += `🎯 **${focusCount || 0}** active focus blocks\n\n`

  if (pendingCount && pendingCount > 0) {
    message += `To optimize your schedule, visit the Tasks page and click "Auto-schedule" to let AI find the best time slots for your pending tasks.`
  } else if (scheduledCount && scheduledCount > 0) {
    message += `Your schedule looks good! All tasks are scheduled.`
  } else {
    message += `You don't have any tasks yet. Create some tasks and I'll help you schedule them optimally!`
  }

  return {
    success: true,
    message,
    data: {
      pendingTasks: pendingCount || 0,
      scheduledTasks: scheduledCount || 0,
      focusBlocks: focusCount || 0,
    },
  }
}

async function handleGenerateFile(
  entities: ActionPayload,
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const fileType = entities.fileType as string
  const dataSource = entities.dataSource as string || 'tasks'
  const title = entities.title as string || 'Export'

  try {
    if (fileType === 'gantt_chart') {
      // Fetch tasks for Gantt chart
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!tasks || tasks.length === 0) {
        return { success: false, message: 'No tasks found to create a Gantt chart. Create some tasks first!' }
      }

      const ganttTasks = tasks.map((t: Record<string, unknown>) => ({
        name: (t.title as string) || 'Untitled',
        startDate: (t.scheduled_for as string) || (t.created_at as string),
        endDate: (t.deadline as string) || (t.scheduled_for as string) || new Date(new Date(t.created_at as string).getTime() + 86400000).toISOString(),
        status: t.status as string,
        priority: t.priority as number,
      }))

      const result = await generateExcelGanttChart(ganttTasks, title || 'Task Gantt Chart')
      return {
        success: true,
        message: `Gantt chart created with ${tasks.length} tasks! Click download to save it.`,
        data: {
          generatedFile: {
            base64: result.buffer.toString('base64'),
            filename: result.filename,
            mimeType: result.mimeType,
          },
        },
      }
    }

    if (fileType === 'spreadsheet') {
      let headers: string[] = []
      let rows: (string | number | boolean)[][] = []

      if (dataSource === 'tasks') {
        const { data: tasks } = await supabase.from('tasks').select('*').eq('user_id', userId).limit(100)
        headers = ['Title', 'Status', 'Priority', 'Deadline', 'Created']
        rows = (tasks || []).map((t: Record<string, unknown>) => [
          (t.title as string) || '', (t.status as string) || '', (t.priority as number) || 3,
          t.deadline ? new Date(t.deadline as string).toLocaleDateString() : 'None',
          new Date(t.created_at as string).toLocaleDateString(),
        ])
      } else if (dataSource === 'habits') {
        const { data: habits } = await supabase.from('habits').select('*').eq('user_id', userId).limit(100)
        headers = ['Name', 'Category', 'Frequency', 'Current Streak', 'Best Streak']
        rows = (habits || []).map((h: Record<string, unknown>) => [
          (h.name as string) || '', (h.category as string) || '', (h.frequency as string) || '',
          (h.current_streak as number) || 0, (h.best_streak as number) || 0,
        ])
      } else if (dataSource === 'calendar') {
        const { data: events } = await supabase.from('calendar_events').select('*').eq('user_id', userId).limit(100)
        headers = ['Title', 'Start', 'End', 'Location', 'Status']
        rows = (events || []).map((e: Record<string, unknown>) => [
          (e.title as string) || '', new Date(e.start_time as string).toLocaleString(),
          new Date(e.end_time as string).toLocaleString(), (e.location as string) || '', (e.status as string) || '',
        ])
      } else if (dataSource === 'meal_plans') {
        const { data: meals } = await supabase.from('meal_plans').select('*').eq('user_id', userId).limit(100)
        headers = ['Name', 'Type', 'Calories', 'Date']
        rows = (meals || []).map((m: Record<string, unknown>) => [
          (m.name as string) || '', (m.meal_type as string) || '',
          (m.calories as number) || 0, m.date ? new Date(m.date as string).toLocaleDateString() : '',
        ])
      }

      if (rows.length === 0) {
        return { success: false, message: `No ${dataSource} data found to export.` }
      }

      const result = await generateExcelSpreadsheet({ title: title || dataSource, headers, rows })
      return {
        success: true,
        message: `Spreadsheet created with ${rows.length} rows! Click download to save it.`,
        data: {
          generatedFile: {
            base64: result.buffer.toString('base64'),
            filename: result.filename,
            mimeType: result.mimeType,
          },
        },
      }
    }

    if (fileType === 'csv_export') {
      let headers: string[] = []
      let rows: (string | number | boolean)[][] = []

      if (dataSource === 'tasks') {
        const { data: tasks } = await supabase.from('tasks').select('*').eq('user_id', userId)
        headers = ['Title', 'Status', 'Priority', 'Deadline', 'Created']
        rows = (tasks || []).map((t: Record<string, unknown>) => [
          (t.title as string) || '', (t.status as string) || '', (t.priority as number) || 3,
          t.deadline ? new Date(t.deadline as string).toLocaleDateString() : '', new Date(t.created_at as string).toLocaleDateString(),
        ])
      } else if (dataSource === 'habits') {
        const { data: habits } = await supabase.from('habits').select('*').eq('user_id', userId)
        headers = ['Name', 'Category', 'Frequency', 'Current Streak', 'Best Streak']
        rows = (habits || []).map((h: Record<string, unknown>) => [
          (h.name as string) || '', (h.category as string) || '', (h.frequency as string) || '',
          (h.current_streak as number) || 0, (h.best_streak as number) || 0,
        ])
      }

      if (rows.length === 0) {
        return { success: false, message: `No ${dataSource} data found to export.` }
      }

      const result = generateCSV(headers, rows, title || dataSource)
      return {
        success: true,
        message: `CSV file created with ${rows.length} rows! Click download to save it.`,
        data: {
          generatedFile: {
            base64: result.buffer.toString('base64'),
            filename: result.filename,
            mimeType: result.mimeType,
          },
        },
      }
    }

    if (fileType === 'pdf_report') {
      const sections: { heading: string; content: string }[] = []

      // Gather data for the report
      const { data: tasks } = await supabase.from('tasks').select('*').eq('user_id', userId).limit(20)
      const { data: habits } = await supabase.from('habits').select('*').eq('user_id', userId).limit(20)
      const { data: events } = await supabase.from('calendar_events').select('*').eq('user_id', userId)
        .gte('start_time', new Date().toISOString()).limit(10)

      if (tasks && tasks.length > 0) {
        const completed = tasks.filter((t: Record<string, unknown>) => t.status === 'completed').length
        const pending = tasks.filter((t: Record<string, unknown>) => t.status === 'pending').length
        sections.push({
          heading: 'Tasks Overview',
          content: `You have ${tasks.length} tasks total. ${completed} completed, ${pending} pending.\n\n` +
            tasks.slice(0, 10).map((t: Record<string, unknown>) => `• ${t.title} (${t.status})`).join('\n'),
        })
      }

      if (habits && habits.length > 0) {
        sections.push({
          heading: 'Habits Summary',
          content: habits.map((h: Record<string, unknown>) =>
            `• ${h.name}: ${h.current_streak || 0} day streak (best: ${h.best_streak || 0})`
          ).join('\n'),
        })
      }

      if (events && events.length > 0) {
        sections.push({
          heading: 'Upcoming Events',
          content: events.map((e: Record<string, unknown>) =>
            `• ${e.title} - ${new Date(e.start_time as string).toLocaleString()}`
          ).join('\n'),
        })
      }

      if (sections.length === 0) {
        return { success: false, message: 'No data found to generate a report.' }
      }

      const result = await generatePDFReport(title || 'Life Organizer Report', sections)
      return {
        success: true,
        message: `PDF report generated! Click download to save it.`,
        data: {
          generatedFile: {
            base64: result.buffer.toString('base64'),
            filename: result.filename,
            mimeType: result.mimeType,
          },
        },
      }
    }

    return { success: false, message: `Unknown file type: ${fileType}. Supported: gantt_chart, spreadsheet, csv_export, pdf_report` }
  } catch (error) {
    return { success: false, message: `Error generating file: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

// --- New ClickUp + Math Intent Handlers ---

async function handleCreateProject(
  entities: ActionPayload,
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const { name, description, color } = entities

  if (!name) {
    return { success: false, message: 'Please provide a name for the project' }
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      name: name as string,
      description: description as string | undefined,
      color: (color as string) || '#6366f1',
      icon: 'folder',
      status: 'active',
    })
    .select()
    .single()

  if (error) {
    return { success: false, message: `Failed to create project: ${error.message}` }
  }

  return {
    success: true,
    message: `Project "${name}" created! You can now assign tasks to it.`,
    data: { projectId: data.id },
  }
}

async function handleCreateHabit(
  entities: ActionPayload,
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const { name, description, icon, frequency, reminderTime, category, durationMinutes } = entities

  if (!name) {
    return { success: false, message: 'Please provide a name for the habit' }
  }

  const freq = (frequency as string | undefined)?.toLowerCase() || 'daily'
  const validFrequencies = ['daily', 'weekly', 'monthly']
  const habitFrequency = validFrequencies.includes(freq) ? freq : 'daily'

  const { data, error } = await (supabase.from('habits') as any).insert({
    user_id: userId,
    name: name as string,
    description: description as string | undefined,
    icon: (icon as string) || '✓',
    color: '#6366f1',
    frequency: habitFrequency,
    frequency_config: {},
    target_count: 1,
    reminder_time: reminderTime as string | undefined || null,
    reminder_enabled: !!(reminderTime),
    start_date: new Date().toISOString().split('T')[0],
    category: category as string | undefined,
    is_active: true,
    duration_minutes: (durationMinutes as number) || 15,
    energy_level: null,
    auto_schedule: false,
    preferred_time_of_day: 'anytime',
    scheduling_priority: 3,
  }).select().single()

  if (error) {
    return { success: false, message: `Failed to create habit: ${error.message}` }
  }

  return {
    success: true,
    message: `Habit "${name}" created! It will appear in your daily protocols.`,
    data: { habitId: data.id },
  }
}

async function handleCreateTasks(
  entities: ActionPayload,
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const { tasks } = entities

  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return { success: false, message: 'Please provide a list of tasks to create' }
  }

  const rows = (tasks as Array<{ title: string; duration?: string | number; deadline?: string; priority?: string | number; description?: string }>).map(t => {
    let durationMinutes = 30
    if (t.duration) {
      const ds = String(t.duration).toLowerCase()
      if (ds.includes('hour')) durationMinutes = (parseInt(ds) || 1) * 60
      else if (ds.includes('min')) durationMinutes = parseInt(ds) || 30
      else durationMinutes = parseInt(ds) || 30
    }

    let taskPriority = 3
    if (t.priority) {
      const ps = String(t.priority).toLowerCase()
      if (ps === 'urgent' || ps === 'critical' || ps === '1') taskPriority = 1
      else if (ps === 'high' || ps === '2') taskPriority = 2
      else if (ps === 'medium' || ps === '3') taskPriority = 3
      else if (ps === 'low' || ps === '4') taskPriority = 4
      else taskPriority = parseInt(ps) || 3
    }

    return {
      user_id: userId,
      title: t.title,
      description: t.description,
      deadline: t.deadline || null,
      duration_minutes: durationMinutes,
      priority: taskPriority,
      tags: [],
      status: 'pending',
      is_auto_scheduled: true,
      reschedule_count: 0,
    }
  })

  const { data, error } = await supabase.from('tasks').insert(rows).select()

  if (error) {
    return { success: false, message: `Failed to create tasks: ${error.message}` }
  }

  return {
    success: true,
    message: `Created ${rows.length} task${rows.length === 1 ? '' : 's'}: ${rows.map(r => `"${r.title}"`).join(', ')}`,
    data: { taskIds: (data || []).map((t: { id: string }) => t.id) },
  }
}

async function handleSchedulePlan(
  entities: ActionPayload,
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  // tasks: [{title, duration (minutes), description?, priority?}]
  // startTime: "HH:MM" or "10:00am"
  // date: "YYYY-MM-DD" or natural language (defaults to today)
  const { tasks, startTime, date } = entities

  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return { success: false, message: 'Please provide a list of tasks to schedule' }
  }
  if (!startTime) {
    return { success: false, message: 'Please provide a start time (e.g., "10:00am")' }
  }

  const dateStr = date ? String(date) : new Date().toISOString().split('T')[0]
  const baseDate = parseNaturalDateLocal(dateStr)
  const startTimeParsed = parseTimeString(String(startTime))
  if (!startTimeParsed) {
    return { success: false, message: `Could not parse start time: "${startTime}"` }
  }

  // Get user's primary calendar
  const { data: calendars } = await supabase
    .from('calendars')
    .select('id')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .single()
  const calendarId = calendars?.id

  const taskRows: object[] = []
  const eventRows: object[] = []
  let cursor = new Date(baseDate)
  cursor.setHours(startTimeParsed.hours, startTimeParsed.minutes, 0, 0)

  for (const t of tasks as Array<{ title: string; duration?: string | number; description?: string; priority?: string | number }>) {
    let durationMinutes = 30
    if (t.duration) {
      const ds = String(t.duration).toLowerCase()
      if (ds.includes('hour')) durationMinutes = (parseInt(ds) || 1) * 60
      else if (ds.includes('min')) durationMinutes = parseInt(ds) || 30
      else durationMinutes = parseInt(ds) || 30
    }

    let taskPriority = 3
    if (t.priority) {
      const ps = String(t.priority).toLowerCase()
      if (ps === 'urgent' || ps === 'critical' || ps === '1') taskPriority = 1
      else if (ps === 'high' || ps === '2') taskPriority = 2
      else taskPriority = parseInt(ps) || 3
    }

    const blockStart = new Date(cursor)
    const blockEnd = new Date(cursor.getTime() + durationMinutes * 60000)

    taskRows.push({
      user_id: userId,
      title: t.title,
      description: t.description,
      duration_minutes: durationMinutes,
      priority: taskPriority,
      tags: [],
      status: 'scheduled',
      is_auto_scheduled: true,
      reschedule_count: 0,
      scheduled_start: blockStart.toISOString(),
      scheduled_end: blockEnd.toISOString(),
    })

    eventRows.push({
      user_id: userId,
      calendar_id: calendarId,
      title: t.title,
      description: t.description,
      start_time: blockStart.toISOString(),
      end_time: blockEnd.toISOString(),
      all_day: false,
      status: 'confirmed',
      priority: taskPriority,
      reminders: [],
      is_auto_scheduled: true,
      metadata: { source: 'schedule_plan' },
    })

    // Add 5-min buffer between blocks
    cursor = new Date(blockEnd.getTime() + 5 * 60000)
  }

  const { error: taskError } = await supabase.from('tasks').insert(taskRows)
  if (taskError) {
    return { success: false, message: `Failed to create tasks: ${taskError.message}` }
  }

  const { error: eventError } = await supabase.from('calendar_events').insert(eventRows)
  if (eventError) {
    // Tasks were created but events failed — still report partial success
    return {
      success: true,
      message: `Created ${taskRows.length} task${taskRows.length === 1 ? '' : 's'} (calendar scheduling failed: ${eventError.message}). Check your Tasks page.`,
    }
  }

  const startLabel = `${startTimeParsed.hours % 12 || 12}:${String(startTimeParsed.minutes).padStart(2, '0')}${startTimeParsed.hours >= 12 ? 'pm' : 'am'}`
  return {
    success: true,
    message: `Scheduled ${taskRows.length} block${taskRows.length === 1 ? '' : 's'} starting at ${startLabel}. They're now on your calendar and task list.`,
    data: { count: taskRows.length },
  }
}

function parseNaturalDateLocal(dateStr: string): Date {
  const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]))
  const d = new Date(dateStr)
  if (!isNaN(d.getTime())) return d
  return new Date()
}

function parseTimeString(timeStr: string): { hours: number; minutes: number } | null {
  const s = timeStr.toLowerCase().trim()
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/)
  if (!m) return null
  let h = parseInt(m[1])
  const min = m[2] ? parseInt(m[2]) : 0
  const period = m[3]
  if (period === 'pm' && h < 12) h += 12
  if (period === 'am' && h === 12) h = 0
  if (h >= 0 && h <= 23 && min >= 0 && min <= 59) return { hours: h, minutes: min }
  return null
}

async function handleStartTimer(
  entities: ActionPayload,
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const { taskName, taskId } = entities

  let targetTaskId = taskId as string | undefined

  if (!targetTaskId && taskName) {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('user_id', userId)
      .in('status', ['pending', 'scheduled', 'in_progress'])
      .ilike('title', `%${taskName}%`)
      .limit(1)

    if (!tasks || tasks.length === 0) {
      return { success: false, message: `No task found matching "${taskName}"` }
    }
    targetTaskId = tasks[0].id
  }

  if (!targetTaskId) {
    return { success: false, message: 'Please specify which task to track time for' }
  }

  // Stop any running timer
  const now = new Date().toISOString()
  const { data: running } = await supabase
    .from('time_entries')
    .select('id, start_time')
    .eq('user_id', userId)
    .eq('is_running', true)

  if (running && running.length > 0) {
    for (const entry of running) {
      const duration = Math.floor((Date.now() - new Date(entry.start_time).getTime()) / 1000)
      await supabase
        .from('time_entries')
        .update({ is_running: false, end_time: now, duration_seconds: duration })
        .eq('id', entry.id)
    }
  }

  // Start new timer
  const { error } = await supabase
    .from('time_entries')
    .insert({ user_id: userId, task_id: targetTaskId, start_time: now, is_running: true })

  if (error) {
    return { success: false, message: `Failed to start timer: ${error.message}` }
  }

  return { success: true, message: 'Timer started! I\'ll track your time on this task.' }
}

async function handleStopTimer(
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const now = new Date().toISOString()

  const { data: running } = await supabase
    .from('time_entries')
    .select('id, start_time, task_id, tasks(title)')
    .eq('user_id', userId)
    .eq('is_running', true)

  if (!running || running.length === 0) {
    return { success: false, message: 'No timer is currently running' }
  }

  let totalMinutes = 0
  for (const entry of running) {
    const duration = Math.floor((Date.now() - new Date(entry.start_time).getTime()) / 1000)
    totalMinutes += Math.round(duration / 60)
    await supabase
      .from('time_entries')
      .update({ is_running: false, end_time: now, duration_seconds: duration })
      .eq('id', entry.id)
  }

  return {
    success: true,
    message: `Timer stopped! You tracked ${totalMinutes} minutes.`,
  }
}

async function handleCreateDocument(
  entities: ActionPayload,
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const { title, content, projectId } = entities

  const { data, error } = await supabase
    .from('documents')
    .insert({
      user_id: userId,
      title: (title as string) || 'Untitled',
      content: content ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: content as string }] }] } : {},
      plain_text_content: (content as string) || '',
      project_id: projectId as string | undefined,
    })
    .select()
    .single()

  if (error) {
    return { success: false, message: `Failed to create document: ${error.message}` }
  }

  return {
    success: true,
    message: `Document "${title || 'Untitled'}" created! Open it in the Docs section to edit.`,
    data: { documentId: data.id },
  }
}

async function handleSearchEverything(
  entities: ActionPayload,
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const { query } = entities
  if (!query) {
    return { success: false, message: 'Please provide a search query' }
  }

  const searchTerm = `%${query}%`

  const [tasksResult, habitsResult] = await Promise.all([
    supabase.from('tasks').select('id, title, status').eq('user_id', userId).ilike('title', searchTerm).limit(5),
    supabase.from('habits').select('id, name').eq('user_id', userId).ilike('name', searchTerm).limit(5),
  ])

  const tasks = tasksResult.data || []
  const habits = habitsResult.data || []
  const total = tasks.length + habits.length

  if (total === 0) {
    return { success: true, message: `No results found for "${query}"`, data: { results: [] } }
  }

  let message = `Found ${total} results for "${query}":\n\n`
  if (tasks.length > 0) {
    message += `**Tasks:**\n${tasks.map(t => `• ${t.title} (${t.status})`).join('\n')}\n\n`
  }
  if (habits.length > 0) {
    message += `**Habits:**\n${habits.map(h => `• ${h.name}`).join('\n')}`
  }

  return { success: true, message, data: { tasks, habits } }
}

async function handleCreateAutomation(
  entities: ActionPayload,
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const { name, triggerType, actionType, description, triggerConfig, actionConfig } = entities

  if (!triggerType || !actionType) {
    return { success: false, message: 'Please specify a trigger and action for the automation' }
  }

  const validTriggers = [
    'task_completed', 'task_created', 'task_status_changed',
    'habit_completed', 'habit_streak_reached', 'time_entry_logged',
    'deadline_approaching', 'project_completed', 'xp_milestone',
    'schedule_event', 'daily_time', 'weekly_time', 'monthly_date',
  ]
  const validActions = [
    'award_xp', 'create_task', 'update_task_status', 'send_notification',
    'create_achievement', 'move_to_project', 'add_tag', 'log_activity',
    'create_document', 'create_event', 'capture_thought', 'send_brief',
  ]

  const trigger = triggerType as string
  const action = actionType as string

  if (!validTriggers.includes(trigger)) {
    return { success: false, message: `Invalid trigger type: ${trigger}. Valid: ${validTriggers.join(', ')}` }
  }
  if (!validActions.includes(action)) {
    return { success: false, message: `Invalid action type: ${action}. Valid: ${validActions.join(', ')}` }
  }

  // Validate time-based trigger configs
  if (trigger === 'daily_time' || trigger === 'weekly_time' || trigger === 'monthly_date') {
    const cfg = (triggerConfig as Record<string, unknown>) || {}
    if (!cfg.time) {
      return { success: false, message: `Time-based automations require a time in trigger config (e.g., "09:00")` }
    }
  }

  const { data, error } = await supabase
    .from('automation_rules')
    .insert({
      user_id: userId,
      name: (name as string) || `${trigger} → ${action}`,
      description: description as string | undefined,
      trigger_type: trigger,
      action_type: action,
      trigger_config: (triggerConfig as object) || {},
      action_config: (actionConfig as object) || {},
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    return { success: false, message: `Failed to create automation: ${error.message}` }
  }

  // Build human-readable schedule description
  let schedDesc = ''
  if (trigger === 'daily_time') {
    const tc = (triggerConfig as Record<string, unknown>) || {}
    schedDesc = ` Runs daily at ${tc.time}.`
  } else if (trigger === 'weekly_time') {
    const tc = (triggerConfig as Record<string, unknown>) || {}
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    const day = days[tc.dayOfWeek as number] || 'Monday'
    schedDesc = ` Runs every ${day} at ${tc.time}.`
  } else if (trigger === 'monthly_date') {
    const tc = (triggerConfig as Record<string, unknown>) || {}
    schedDesc = ` Runs on day ${tc.dayOfMonth} of each month at ${tc.time}.`
  }

  return {
    success: true,
    message: `Automation "${name || data.name}" created and active!${schedDesc} It will execute automatically.`,
    data: { automationId: data.id },
  }
}

async function handleLearnBehavior(
  entities: ActionPayload,
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const { trigger, action, name } = entities

  if (!trigger || !action) {
    return { success: false, message: 'Please provide both a trigger phrase and what action to take' }
  }

  // Fetch existing learned patterns
  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('learned_patterns')
    .eq('user_id', userId)
    .single()

  const learnedPatterns = (prefs?.learned_patterns as Record<string, unknown>) || {}
  const existingBehaviors = (learnedPatterns.learnedBehaviors as LearnedBehavior[]) || []

  // Check if this trigger already exists — update it
  const existing = existingBehaviors.find(b =>
    b.trigger.toLowerCase() === String(trigger).toLowerCase()
  )

  let updated: LearnedBehavior[]
  let isUpdate = false

  if (existing) {
    updated = existingBehaviors.map(b =>
      b.id === existing.id ? { ...b, action: action as string } : b
    )
    isUpdate = true
  } else {
    const newBehavior: LearnedBehavior = {
      id: crypto.randomUUID(),
      trigger: String(trigger),
      action: String(action),
      createdAt: new Date().toISOString(),
      useCount: 0,
    }
    updated = [...existingBehaviors, newBehavior]
  }

  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      learned_patterns: { ...learnedPatterns, learnedBehaviors: updated },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) {
    return { success: false, message: `Failed to save behavior: ${error.message}` }
  }

  const label = (name as string) || String(trigger)
  return {
    success: true,
    message: isUpdate
      ? `Updated skill "${label}": when you say "${trigger}", I'll ${action}.`
      : `Learned new skill "${label}": when you say "${trigger}", I'll ${action}. Use this phrase anytime.`,
    data: { behaviorCount: updated.length },
  }
}

async function handleSolveMath(
  entities: ActionPayload,
  _userId: string,
): Promise<ActionResult> {
  const { problem } = entities

  if (!problem) {
    return { success: false, message: 'Please provide a math problem to solve' }
  }

  return {
    success: true,
    message: `To solve math problems with step-by-step solutions, open the Math Solver section. You can type or take a photo of any problem there! For quick help: I can explain the approach to "${problem}" — what would you like to know?`,
    data: { redirectTo: '/math' },
  }
}

async function handlePracticeMath(
  entities: ActionPayload,
): Promise<ActionResult> {
  const { topic, difficulty } = entities

  return {
    success: true,
    message: `Great! Open the Math Solver section to start a practice session${topic ? ` on ${topic}` : ''}${difficulty ? ` (${difficulty} difficulty)` : ''}. I'll generate custom problems for you!`,
    data: { redirectTo: '/math', topic, difficulty },
  }
}

async function handleMathProgress(
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const { data: stats } = await supabase
    .from('math_stats')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!stats) {
    return {
      success: true,
      message: "You haven't solved any math problems yet! Open the Math Solver to get started.",
      data: { redirectTo: '/math' },
    }
  }

  const accuracy = stats.total_problems_solved > 0
    ? Math.round((stats.total_correct / stats.total_problems_solved) * 100)
    : 0

  let message = `**Your Math Progress:**\n\n`
  message += `📊 Problems solved: ${stats.total_problems_solved}\n`
  message += `✅ Accuracy: ${accuracy}%\n`
  message += `🔥 Current streak: ${stats.current_streak} days\n`

  if (stats.topics_mastered?.length > 0) {
    message += `🏆 Topics mastered: ${stats.topics_mastered.join(', ')}\n`
  }
  if (stats.weak_topics?.length > 0) {
    message += `📚 Areas to improve: ${stats.weak_topics.join(', ')}`
  }

  return { success: true, message, data: stats }
}

async function handleAddShoppingItem(
  entities: ActionPayload,
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  // Support single item or array of items
  const rawItems = entities.items || entities.item
  const itemList: string[] = Array.isArray(rawItems)
    ? rawItems.map(String)
    : rawItems
    ? [String(rawItems)]
    : []

  if (itemList.length === 0) {
    return { success: false, message: 'Please specify what to add to the shopping list' }
  }

  const rows = itemList.map((name: string) => ({
    user_id: userId,
    name: name.trim(),
    quantity: 1,
    unit: null,
    category: (entities.category as string) || null,
    is_checked: false,
    added_by: 'ai',
  }))

  const { error } = await (supabase as any).from('shopping_list_items').insert(rows)

  if (error) {
    return { success: false, message: `Failed to add items: ${error.message}` }
  }

  const names = itemList.join(', ')
  return {
    success: true,
    message: `Added to shopping list: ${names}`,
    data: { itemCount: itemList.length },
  }
}

async function handleCreateKnowledgeNote(
  entities: ActionPayload,
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const { title, type, content, tags, confidence, source } = entities

  if (!title) {
    return { success: false, message: 'Please provide a title for the knowledge note' }
  }

  // Generate Zettelkasten ID
  const base = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)
  const suffixes = ['', 'a', 'b', 'c', 'd', 'e', 'f']
  let zettelId = base
  for (const s of suffixes) {
    const id = base + s
    const { data } = await (supabase as any).from('knowledge_notes').select('id').eq('zettel_id', id).maybeSingle()
    if (!data) { zettelId = id; break }
  }

  const validTypes = ['fleeting', 'permanent', 'concept', 'experience', 'project', 'hub', 'reference']
  const noteType = validTypes.includes(String(type)) ? String(type) : 'permanent'

  const tagList = Array.isArray(tags) ? tags : (typeof tags === 'string' ? [tags] : [])

  const { data, error } = await (supabase as any).from('knowledge_notes').insert({
    zettel_id: zettelId,
    user_id: userId,
    title: String(title).trim(),
    type: noteType,
    content: String(content || ''),
    tags: tagList,
    confidence: typeof confidence === 'number' ? confidence : 0.8,
    importance: 0.5,
    source: source === 'AI' ? 'AI' : 'user',
    is_archived: false,
  }).select().single()

  if (error) {
    return { success: false, message: `Failed to create note: ${error.message}` }
  }

  // Log cognitive event
  await (supabase as any).from('cognitive_events').insert({
    user_id: userId,
    event_type: 'note_created',
    related_note_ids: [data.id],
    description: `Strategist created ${noteType} note: "${title}" [${zettelId}]`,
  })

  return {
    success: true,
    message: `Created ${noteType} note "${title}" [${zettelId}] in your Second Brain`,
    data: { noteId: data.id, zettelId, type: noteType },
  }
}

async function handleLinkKnowledgeNotes(
  entities: ActionPayload,
  userId: string,
  supabase: SupabaseClient
): Promise<ActionResult> {
  const { sourceTitle, targetTitle, relationship } = entities

  if (!sourceTitle || !targetTitle) {
    return { success: false, message: 'Please specify both note titles to link' }
  }

  // Find notes by title (case-insensitive fuzzy match)
  const { data: sourceNotes } = await (supabase as any)
    .from('knowledge_notes')
    .select('id, title')
    .eq('user_id', userId)
    .ilike('title', `%${String(sourceTitle).trim()}%`)
    .limit(1)

  const { data: targetNotes } = await (supabase as any)
    .from('knowledge_notes')
    .select('id, title')
    .eq('user_id', userId)
    .ilike('title', `%${String(targetTitle).trim()}%`)
    .limit(1)

  const source = sourceNotes?.[0]
  const target = targetNotes?.[0]

  if (!source) return { success: false, message: `Could not find note matching: "${sourceTitle}"` }
  if (!target) return { success: false, message: `Could not find note matching: "${targetTitle}"` }
  if (source.id === target.id) return { success: false, message: 'Cannot link a note to itself' }

  const validRelationships = ['supports', 'contradicts', 'extends', 'applies_to', 'derived_from', 'related']
  const rel = validRelationships.includes(String(relationship)) ? String(relationship) : 'related'

  const { error } = await (supabase as any).from('knowledge_links').insert({
    user_id: userId,
    source_note_id: source.id,
    target_note_id: target.id,
    relationship: rel,
    strength: 0.8,
  })

  if (error) {
    if (error.code === '23505') return { success: false, message: 'These notes are already linked' }
    return { success: false, message: `Failed to link notes: ${error.message}` }
  }

  // Log cognitive event
  await (supabase as any).from('cognitive_events').insert({
    user_id: userId,
    event_type: 'link_created',
    related_note_ids: [source.id, target.id],
    description: `Strategist linked "${source.title}" → [${rel}] → "${target.title}"`,
  })

  return {
    success: true,
    message: `Linked "${source.title}" → [${rel}] → "${target.title}"`,
    data: { sourceId: source.id, targetId: target.id, relationship: rel },
  }
}
