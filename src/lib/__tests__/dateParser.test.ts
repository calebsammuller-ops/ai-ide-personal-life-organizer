import { describe, it, expect, beforeEach } from 'vitest'
import {
  parseNaturalDate,
  parseNaturalTime,
  parseDateTime,
  parseNaturalDateTime,
} from '../dateParser'

describe('parseNaturalDate', () => {
  let referenceDate: Date

  beforeEach(() => {
    // Use a fixed reference date for consistent tests
    referenceDate = new Date('2024-06-15T10:00:00')
  })

  it('should parse "today"', () => {
    const result = parseNaturalDate('today', referenceDate)
    // Same day as reference
    expect(result.getDate()).toBe(referenceDate.getDate())
    expect(result.getMonth()).toBe(referenceDate.getMonth())
    expect(result.getFullYear()).toBe(referenceDate.getFullYear())
  })

  it('should parse "tomorrow"', () => {
    const result = parseNaturalDate('tomorrow', referenceDate)
    const daysDiff = Math.round((result.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24))
    expect(daysDiff).toBe(1)
  })

  it('should parse "yesterday"', () => {
    const result = parseNaturalDate('yesterday', referenceDate)
    const daysDiff = Math.round((result.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24))
    expect(daysDiff).toBe(-1)
  })

  it('should parse "in 3 days"', () => {
    const result = parseNaturalDate('in 3 days', referenceDate)
    const daysDiff = Math.round((result.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24))
    expect(daysDiff).toBe(3)
  })

  it('should parse "in 2 weeks"', () => {
    const result = parseNaturalDate('in 2 weeks', referenceDate)
    // Should be approximately 14 days from reference
    const daysDiff = Math.round((result.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24))
    expect(daysDiff).toBe(14)
  })

  it('should parse "next Monday"', () => {
    // June 15, 2024 is a Saturday, next Monday is June 17
    const result = parseNaturalDate('next Monday', referenceDate)
    expect(result.getDay()).toBe(1) // Monday
  })

  it('should parse "next week"', () => {
    const result = parseNaturalDate('next week', referenceDate)
    // Should be 7 days from reference
    const daysDiff = Math.round((result.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24))
    expect(daysDiff).toBe(7)
  })

  it('should parse "January 15"', () => {
    const result = parseNaturalDate('January 15', referenceDate)
    expect(result.getMonth()).toBe(0) // January
    expect(result.getDate()).toBe(15)
  })

  it('should parse "15th January"', () => {
    const result = parseNaturalDate('15th January', referenceDate)
    expect(result.getMonth()).toBe(0)
    expect(result.getDate()).toBe(15)
  })

  it('should parse "6/20" as MM/DD', () => {
    const result = parseNaturalDate('6/20', referenceDate)
    expect(result.getMonth()).toBe(5) // June
    expect(result.getDate()).toBe(20)
  })

  it('should handle ISO date strings', () => {
    const result = parseNaturalDate('2024-07-04', referenceDate)
    expect(result.getFullYear()).toBe(2024)
    expect(result.getMonth()).toBe(6) // July
    expect(result.getDate()).toBe(4)
  })
})

describe('parseNaturalTime', () => {
  it('should parse "3pm"', () => {
    const result = parseNaturalTime('3pm')
    expect(result).toEqual({ hours: 15, minutes: 0 })
  })

  it('should parse "3:30pm"', () => {
    const result = parseNaturalTime('3:30pm')
    expect(result).toEqual({ hours: 15, minutes: 30 })
  })

  it('should parse "3:30 PM"', () => {
    const result = parseNaturalTime('3:30 PM')
    expect(result).toEqual({ hours: 15, minutes: 30 })
  })

  it('should parse "15:00"', () => {
    const result = parseNaturalTime('15:00')
    expect(result).toEqual({ hours: 15, minutes: 0 })
  })

  it('should parse "noon"', () => {
    const result = parseNaturalTime('noon')
    expect(result).toEqual({ hours: 12, minutes: 0 })
  })

  it('should parse "midnight"', () => {
    const result = parseNaturalTime('midnight')
    expect(result).toEqual({ hours: 0, minutes: 0 })
  })

  it('should parse "half past 3"', () => {
    const result = parseNaturalTime('half past 3')
    expect(result).toEqual({ hours: 3, minutes: 30 })
  })

  it('should parse "quarter to 5"', () => {
    const result = parseNaturalTime('quarter to 5')
    expect(result).toEqual({ hours: 4, minutes: 45 })
  })

  it('should parse "quarter past 2"', () => {
    const result = parseNaturalTime('quarter past 2')
    expect(result).toEqual({ hours: 2, minutes: 15 })
  })

  it('should handle 12am correctly', () => {
    const result = parseNaturalTime('12am')
    expect(result).toEqual({ hours: 0, minutes: 0 })
  })

  it('should handle 12pm correctly', () => {
    const result = parseNaturalTime('12pm')
    expect(result).toEqual({ hours: 12, minutes: 0 })
  })
})

describe('parseDateTime', () => {
  it('should combine date and time', () => {
    const referenceDate = new Date('2024-06-15T10:00:00')
    const result = parseDateTime('tomorrow', '3pm', referenceDate)

    expect(result.toISOString().split('T')[0]).toBe('2024-06-16')
    expect(result.getHours()).toBe(15)
    expect(result.getMinutes()).toBe(0)
  })
})

describe('parseNaturalDateTime', () => {
  it('should parse "tomorrow at 3pm"', () => {
    const referenceDate = new Date('2024-06-15T10:00:00')
    const result = parseNaturalDateTime('tomorrow at 3pm', referenceDate)

    expect(result.hasTime).toBe(true)
    expect(result.date.toISOString().split('T')[0]).toBe('2024-06-16')
    expect(result.date.getHours()).toBe(15)
  })

  it('should parse "next Monday @ noon"', () => {
    const referenceDate = new Date('2024-06-15T10:00:00')
    const result = parseNaturalDateTime('next Monday @ noon', referenceDate)

    expect(result.hasTime).toBe(true)
    expect(result.date.getDay()).toBe(1) // Monday
    expect(result.date.getHours()).toBe(12)
  })
})
