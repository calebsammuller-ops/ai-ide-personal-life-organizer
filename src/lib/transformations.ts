/**
 * Utility functions for transforming data between database (snake_case) and frontend (camelCase) formats
 */

type SnakeToCamelCase<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<SnakeToCamelCase<U>>}`
  : S

type CamelToSnakeCase<S extends string> = S extends `${infer T}${infer U}`
  ? T extends Capitalize<T>
    ? `_${Lowercase<T>}${CamelToSnakeCase<U>}`
    : `${T}${CamelToSnakeCase<U>}`
  : S

/**
 * Convert a snake_case string to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Convert a camelCase string to snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

/**
 * Transform an object's keys from snake_case to camelCase
 */
export function transformToCamelCase<T extends Record<string, unknown>>(
  obj: T
): Record<string, unknown> {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item =>
      typeof item === 'object' && item !== null
        ? transformToCamelCase(item as Record<string, unknown>)
        : item
    ) as unknown as Record<string, unknown>
  }

  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key)

    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[camelKey] = transformToCamelCase(value as Record<string, unknown>)
    } else if (Array.isArray(value)) {
      result[camelKey] = value.map(item =>
        typeof item === 'object' && item !== null
          ? transformToCamelCase(item as Record<string, unknown>)
          : item
      )
    } else {
      result[camelKey] = value
    }
  }

  return result
}

/**
 * Transform an object's keys from camelCase to snake_case
 */
export function transformToSnakeCase<T extends Record<string, unknown>>(
  obj: T
): Record<string, unknown> {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item =>
      typeof item === 'object' && item !== null
        ? transformToSnakeCase(item as Record<string, unknown>)
        : item
    ) as unknown as Record<string, unknown>
  }

  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key)

    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[snakeKey] = transformToSnakeCase(value as Record<string, unknown>)
    } else if (Array.isArray(value)) {
      result[snakeKey] = value.map(item =>
        typeof item === 'object' && item !== null
          ? transformToSnakeCase(item as Record<string, unknown>)
          : item
      )
    } else {
      result[snakeKey] = value
    }
  }

  return result
}

/**
 * Build a partial update object from camelCase to snake_case, only including defined values
 */
export function buildSnakeCaseUpdates(
  body: Record<string, unknown>,
  fieldMappings: Record<string, string>
): Record<string, unknown> {
  const updates: Record<string, unknown> = {}

  for (const [camelKey, snakeKey] of Object.entries(fieldMappings)) {
    if (body[camelKey] !== undefined) {
      updates[snakeKey] = body[camelKey]
    }
  }

  return updates
}

// Pre-defined field mappings for common entities
export const habitFieldMappings: Record<string, string> = {
  userId: 'user_id',
  name: 'name',
  description: 'description',
  icon: 'icon',
  color: 'color',
  frequency: 'frequency',
  frequencyConfig: 'frequency_config',
  targetCount: 'target_count',
  reminderTime: 'reminder_time',
  reminderEnabled: 'reminder_enabled',
  startDate: 'start_date',
  endDate: 'end_date',
  isActive: 'is_active',
  category: 'category',
  plan: 'plan',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

export const calendarEventFieldMappings: Record<string, string> = {
  calendarId: 'calendar_id',
  userId: 'user_id',
  title: 'title',
  description: 'description',
  location: 'location',
  startTime: 'start_time',
  endTime: 'end_time',
  allDay: 'all_day',
  recurrenceRule: 'recurrence_rule',
  status: 'status',
  priority: 'priority',
  category: 'category',
  reminders: 'reminders',
  isAutoScheduled: 'is_auto_scheduled',
  metadata: 'metadata',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

export const mealPlanFieldMappings: Record<string, string> = {
  userId: 'user_id',
  date: 'date',
  mealType: 'meal_type',
  name: 'name',
  description: 'description',
  recipeUrl: 'recipe_url',
  calories: 'calories',
  prepTimeMinutes: 'prep_time_minutes',
  cookTimeMinutes: 'cook_time_minutes',
  servings: 'servings',
  ingredients: 'ingredients',
  instructions: 'instructions',
  nutritionalInfo: 'nutritional_info',
  imageUrl: 'image_url',
  tags: 'tags',
  isFavorite: 'is_favorite',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

export const thoughtFieldMappings: Record<string, string> = {
  userId: 'user_id',
  rawContent: 'raw_content',
  processedContent: 'processed_content',
  priority: 'priority',
  category: 'category',
  tags: 'tags',
  extractedTasks: 'extracted_tasks',
  extractedEvents: 'extracted_events',
  isProcessed: 'is_processed',
  isArchived: 'is_archived',
  sentiment: 'sentiment',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

export const userPreferencesFieldMappings: Record<string, string> = {
  userId: 'user_id',
  wakeTime: 'wake_time',
  sleepTime: 'sleep_time',
  workStartTime: 'work_start_time',
  workEndTime: 'work_end_time',
  preferredMealTimes: 'preferred_meal_times',
  notificationsEnabled: 'notifications_enabled',
  theme: 'theme',
  learnedPatterns: 'learned_patterns',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}
