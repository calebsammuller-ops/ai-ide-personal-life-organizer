import { describe, it, expect } from 'vitest'
import {
  snakeToCamel,
  camelToSnake,
  transformToCamelCase,
  transformToSnakeCase,
  buildSnakeCaseUpdates,
  habitFieldMappings,
} from '../transformations'

describe('snakeToCamel', () => {
  it('should convert snake_case to camelCase', () => {
    expect(snakeToCamel('user_id')).toBe('userId')
    expect(snakeToCamel('created_at')).toBe('createdAt')
    expect(snakeToCamel('is_active')).toBe('isActive')
  })

  it('should handle single words', () => {
    expect(snakeToCamel('name')).toBe('name')
    expect(snakeToCamel('id')).toBe('id')
  })

  it('should handle multiple underscores', () => {
    expect(snakeToCamel('user_first_name')).toBe('userFirstName')
  })
})

describe('camelToSnake', () => {
  it('should convert camelCase to snake_case', () => {
    expect(camelToSnake('userId')).toBe('user_id')
    expect(camelToSnake('createdAt')).toBe('created_at')
    expect(camelToSnake('isActive')).toBe('is_active')
  })

  it('should handle single words', () => {
    expect(camelToSnake('name')).toBe('name')
    expect(camelToSnake('id')).toBe('id')
  })

  it('should handle consecutive capitals', () => {
    expect(camelToSnake('userID')).toBe('user_i_d')
  })
})

describe('transformToCamelCase', () => {
  it('should transform object keys', () => {
    const input = {
      user_id: '123',
      created_at: '2024-01-01',
      is_active: true,
    }

    const result = transformToCamelCase(input)

    expect(result).toEqual({
      userId: '123',
      createdAt: '2024-01-01',
      isActive: true,
    })
  })

  it('should handle nested objects', () => {
    const input = {
      user_id: '123',
      frequency_config: {
        days_of_week: [1, 2, 3],
        times_per_week: 3,
      },
    }

    const result = transformToCamelCase(input)

    expect(result).toEqual({
      userId: '123',
      frequencyConfig: {
        daysOfWeek: [1, 2, 3],
        timesPerWeek: 3,
      },
    })
  })

  it('should handle arrays', () => {
    const input = {
      items: [
        { item_name: 'A' },
        { item_name: 'B' },
      ],
    }

    const result = transformToCamelCase(input)

    expect(result).toEqual({
      items: [
        { itemName: 'A' },
        { itemName: 'B' },
      ],
    })
  })

  it('should handle null and undefined', () => {
    expect(transformToCamelCase(null as unknown as Record<string, unknown>)).toBeNull()
    expect(transformToCamelCase(undefined as unknown as Record<string, unknown>)).toBeUndefined()
  })
})

describe('transformToSnakeCase', () => {
  it('should transform object keys', () => {
    const input = {
      userId: '123',
      createdAt: '2024-01-01',
      isActive: true,
    }

    const result = transformToSnakeCase(input)

    expect(result).toEqual({
      user_id: '123',
      created_at: '2024-01-01',
      is_active: true,
    })
  })

  it('should handle nested objects', () => {
    const input = {
      userId: '123',
      frequencyConfig: {
        daysOfWeek: [1, 2, 3],
        timesPerWeek: 3,
      },
    }

    const result = transformToSnakeCase(input)

    expect(result).toEqual({
      user_id: '123',
      frequency_config: {
        days_of_week: [1, 2, 3],
        times_per_week: 3,
      },
    })
  })
})

describe('buildSnakeCaseUpdates', () => {
  it('should build updates from defined values only', () => {
    const body = {
      name: 'Test Habit',
      description: 'A test',
      icon: undefined,
      color: '#FF0000',
    }

    const result = buildSnakeCaseUpdates(body, habitFieldMappings)

    expect(result).toEqual({
      name: 'Test Habit',
      description: 'A test',
      color: '#FF0000',
    })
    expect(result).not.toHaveProperty('icon')
  })

  it('should handle empty body', () => {
    const result = buildSnakeCaseUpdates({}, habitFieldMappings)
    expect(result).toEqual({})
  })

  it('should only include mapped fields', () => {
    const body = {
      name: 'Test',
      unmappedField: 'ignored',
    }

    const result = buildSnakeCaseUpdates(body, habitFieldMappings)

    expect(result).toEqual({ name: 'Test' })
    expect(result).not.toHaveProperty('unmappedField')
  })
})
