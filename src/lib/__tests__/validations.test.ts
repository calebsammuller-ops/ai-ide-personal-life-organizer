import { describe, it, expect } from 'vitest'
import {
  createHabitSchema,
  createThoughtSchema,
  createCalendarEventSchema,
  createMealPlanSchema,
  assistantMessageSchema,
} from '../validations'

describe('createHabitSchema', () => {
  it('should validate a valid habit', () => {
    const validHabit = {
      name: 'Exercise',
      description: 'Daily workout',
      frequency: 'daily',
      targetCount: 1,
    }

    const result = createHabitSchema.safeParse(validHabit)
    expect(result.success).toBe(true)
  })

  it('should require name', () => {
    const invalidHabit = {
      description: 'No name',
    }

    const result = createHabitSchema.safeParse(invalidHabit)
    expect(result.success).toBe(false)
  })

  it('should reject invalid frequency', () => {
    const invalidHabit = {
      name: 'Test',
      frequency: 'invalid',
    }

    const result = createHabitSchema.safeParse(invalidHabit)
    expect(result.success).toBe(false)
  })

  it('should validate color format', () => {
    const validHabit = {
      name: 'Test',
      color: '#FF0000',
    }

    const result = createHabitSchema.safeParse(validHabit)
    expect(result.success).toBe(true)

    const invalidColor = {
      name: 'Test',
      color: 'red',
    }

    const result2 = createHabitSchema.safeParse(invalidColor)
    expect(result2.success).toBe(false)
  })

  it('should validate targetCount range', () => {
    const valid = { name: 'Test', targetCount: 5 }
    expect(createHabitSchema.safeParse(valid).success).toBe(true)

    const tooLow = { name: 'Test', targetCount: 0 }
    expect(createHabitSchema.safeParse(tooLow).success).toBe(false)

    const tooHigh = { name: 'Test', targetCount: 101 }
    expect(createHabitSchema.safeParse(tooHigh).success).toBe(false)
  })
})

describe('createThoughtSchema', () => {
  it('should validate a valid thought', () => {
    const validThought = {
      rawContent: 'This is a thought',
      priority: 3,
    }

    const result = createThoughtSchema.safeParse(validThought)
    expect(result.success).toBe(true)
  })

  it('should require rawContent', () => {
    const invalid = {
      priority: 3,
    }

    const result = createThoughtSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('should reject empty content', () => {
    const invalid = {
      rawContent: '',
    }

    const result = createThoughtSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('should validate priority range', () => {
    const valid = { rawContent: 'Test', priority: 5 }
    expect(createThoughtSchema.safeParse(valid).success).toBe(true)

    const invalid = { rawContent: 'Test', priority: 6 }
    expect(createThoughtSchema.safeParse(invalid).success).toBe(false)
  })
})

describe('createCalendarEventSchema', () => {
  it('should validate a valid event', () => {
    const validEvent = {
      title: 'Meeting',
      startTime: '2024-06-15T10:00:00Z',
      endTime: '2024-06-15T11:00:00Z',
    }

    const result = createCalendarEventSchema.safeParse(validEvent)
    expect(result.success).toBe(true)
  })

  it('should require title', () => {
    const invalid = {
      startTime: '2024-06-15T10:00:00Z',
      endTime: '2024-06-15T11:00:00Z',
    }

    const result = createCalendarEventSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('should validate datetime format', () => {
    const invalid = {
      title: 'Test',
      startTime: 'invalid-date',
      endTime: '2024-06-15T11:00:00Z',
    }

    const result = createCalendarEventSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})

describe('createMealPlanSchema', () => {
  it('should validate a valid meal plan', () => {
    const validMeal = {
      date: '2024-06-15',
      mealType: 'breakfast',
      name: 'Oatmeal',
    }

    const result = createMealPlanSchema.safeParse(validMeal)
    expect(result.success).toBe(true)
  })

  it('should validate mealType enum', () => {
    const valid = {
      date: '2024-06-15',
      mealType: 'lunch',
      name: 'Salad',
    }
    expect(createMealPlanSchema.safeParse(valid).success).toBe(true)

    const invalid = {
      date: '2024-06-15',
      mealType: 'brunch',
      name: 'Eggs',
    }
    expect(createMealPlanSchema.safeParse(invalid).success).toBe(false)
  })

  it('should validate date format', () => {
    const invalid = {
      date: '15-06-2024',
      mealType: 'dinner',
      name: 'Pasta',
    }

    const result = createMealPlanSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})

describe('assistantMessageSchema', () => {
  it('should validate a valid message', () => {
    const validMessage = {
      content: 'Hello, how can I help?',
    }

    const result = assistantMessageSchema.safeParse(validMessage)
    expect(result.success).toBe(true)
  })

  it('should accept optional conversationId', () => {
    const withId = {
      content: 'Hello',
      conversationId: '550e8400-e29b-41d4-a716-446655440000',
    }

    const result = assistantMessageSchema.safeParse(withId)
    expect(result.success).toBe(true)
  })

  it('should reject empty content', () => {
    const invalid = {
      content: '',
    }

    const result = assistantMessageSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('should reject too long content', () => {
    const invalid = {
      content: 'x'.repeat(5001),
    }

    const result = assistantMessageSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})
