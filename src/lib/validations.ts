import { z } from 'zod'

// Common validation patterns
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
const timeString = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (HH:MM or HH:MM:SS)')
const isoDateTime = z.string().datetime({ offset: true }).or(z.string().datetime())
const uuid = z.string().uuid()

// Thought schemas
export const createThoughtSchema = z.object({
  rawContent: z.string().min(1, 'Content is required').max(10000, 'Content too long'),
  category: z.string().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
})

export const updateThoughtSchema = z.object({
  rawContent: z.string().min(1).max(10000).optional(),
  processedContent: z.string().max(20000).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  extractedTasks: z.array(z.object({
    title: z.string(),
    priority: z.number().optional(),
    dueDate: z.string().optional(),
  })).optional(),
  extractedEvents: z.array(z.object({
    title: z.string(),
    date: z.string().optional(),
    time: z.string().optional(),
  })).optional(),
  isProcessed: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
})

// Habit schemas
export const createHabitSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(10).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  frequency: z.enum(['daily', 'weekly', 'custom']).optional(),
  frequencyConfig: z.object({
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    timesPerWeek: z.number().int().min(1).max(7).optional(),
  }).optional(),
  targetCount: z.number().int().min(1).max(100).optional(),
  reminderTime: timeString.optional().nullable(),
  reminderEnabled: z.boolean().optional(),
  startDate: dateString.optional(),
  endDate: dateString.optional().nullable(),
  category: z.string().max(50).optional(),
  // Scheduling fields
  durationMinutes: z.number().int().min(1).max(480).optional(),
  energyLevel: z.enum(['low', 'medium', 'high']).optional().nullable(),
  autoSchedule: z.boolean().optional(),
  preferredTimeOfDay: z.enum(['morning', 'afternoon', 'evening', 'anytime']).optional(),
  schedulingPriority: z.number().int().min(1).max(5).optional(),
})

export const updateHabitSchema = createHabitSchema.partial().extend({
  isActive: z.boolean().optional(),
})

// Calendar event schemas
export const createCalendarEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  location: z.string().max(500).optional(),
  startTime: isoDateTime,
  endTime: isoDateTime,
  allDay: z.boolean().optional(),
  recurrenceRule: z.string().optional().nullable(),
  status: z.enum(['confirmed', 'tentative', 'cancelled']).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  category: z.string().max(50).optional(),
  reminders: z.array(z.object({
    minutes: z.number().int().min(0),
  })).optional(),
  calendarId: uuid.optional(),
})

export const updateCalendarEventSchema = createCalendarEventSchema.partial()

// Meal plan schemas
export const createMealPlanSchema = z.object({
  date: dateString,
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  recipeUrl: z.string().url().optional().nullable(),
  calories: z.number().int().min(0).optional(),
  prepTimeMinutes: z.number().int().min(0).optional(),
  cookTimeMinutes: z.number().int().min(0).optional(),
  servings: z.number().int().min(1).optional(),
  ingredients: z.array(z.string()).optional(),
  instructions: z.array(z.string()).optional(),
  nutritionalInfo: z.object({
    calories: z.number().optional(),
    protein: z.number().optional(),
    carbs: z.number().optional(),
    fat: z.number().optional(),
    fiber: z.number().optional(),
  }).optional(),
  tags: z.array(z.string()).optional(),
  isFavorite: z.boolean().optional(),
})

export const updateMealPlanSchema = createMealPlanSchema.partial()

// Memory schemas
export const createMemorySchema = z.object({
  content: z.string().min(1, 'Content is required').max(500),
  category: z.enum(['personal', 'preference', 'routine', 'goal', 'lifestyle', 'health', 'work']),
})

// Daily plan schemas
export const generateDailyPlanSchema = z.object({
  date: dateString.optional(),
})

export const updateDailyPlanSchema = z.object({
  date: dateString,
  planData: z.array(z.object({
    id: z.string(),
    type: z.enum(['event', 'habit', 'meal', 'break', 'free']),
    title: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    referenceId: z.string().optional(),
    completed: z.boolean().optional(),
    notes: z.string().optional(),
  })).optional(),
  notes: z.string().max(2000).optional(),
  isLocked: z.boolean().optional(),
})

// Live assistant schemas
export const assistantMessageSchema = z.object({
  content: z.string().min(1, 'Message is required').max(5000),
  conversationId: uuid.optional(),
  responseStyle: z.enum(['concise', 'balanced', 'detailed']).optional(),
  attachment: z.object({
    base64: z.string(),
    mimeType: z.string(),
    name: z.string(),
  }).optional(),
  pageContext: z.object({
    currentRoute: z.string(),
    pageTitle: z.string(),
    activeView: z.string().optional(),
    selectedItems: z.array(z.object({
      type: z.string(),
      id: z.string(),
      title: z.string(),
    })).optional(),
    visibleContent: z.record(z.unknown()).optional(),
    userIntent: z.string().nullable().optional(),
    lastInteraction: z.object({
      type: z.string(),
      target: z.string(),
      timestamp: z.number(),
    }).nullable().optional(),
  }).optional(),
})

// User preferences schemas
export const updateUserPreferencesSchema = z.object({
  wakeTime: timeString.optional(),
  sleepTime: timeString.optional(),
  workStartTime: timeString.optional(),
  workEndTime: timeString.optional(),
  preferredMealTimes: z.object({
    breakfast: timeString.optional(),
    lunch: timeString.optional(),
    dinner: timeString.optional(),
  }).optional(),
  notificationsEnabled: z.boolean().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
})

// Helper function to validate request body
export async function validateBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      const errors = result.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ')
      return { success: false, error: errors }
    }

    return { success: true, data: result.data }
  } catch {
    return { success: false, error: 'Invalid JSON body' }
  }
}

// Helper to validate query params
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })

  const result = schema.safeParse(params)

  if (!result.success) {
    const errors = result.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ')
    return { success: false, error: errors }
  }

  return { success: true, data: result.data }
}
