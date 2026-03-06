/**
 * Advanced date and time parsing utility for natural language inputs
 */

interface ParsedDateTime {
  date: Date
  hasTime: boolean
  confidence: 'high' | 'medium' | 'low'
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
]

/**
 * Parse a natural language date string into a Date object
 */
export function parseNaturalDate(dateStr: string, referenceDate: Date = new Date()): Date {
  const input = dateStr.toLowerCase().trim()
  const today = new Date(referenceDate)
  today.setHours(0, 0, 0, 0)

  // Handle relative dates
  if (input === 'today') {
    return today
  }

  if (input === 'tomorrow') {
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow
  }

  if (input === 'yesterday') {
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday
  }

  // Handle "in X days/weeks/months"
  const inPattern = /^in\s+(\d+)\s+(day|days|week|weeks|month|months)$/i
  const inMatch = input.match(inPattern)
  if (inMatch) {
    const amount = parseInt(inMatch[1])
    const unit = inMatch[2].toLowerCase()
    const result = new Date(today)

    if (unit.startsWith('day')) {
      result.setDate(result.getDate() + amount)
    } else if (unit.startsWith('week')) {
      result.setDate(result.getDate() + amount * 7)
    } else if (unit.startsWith('month')) {
      result.setMonth(result.getMonth() + amount)
    }

    return result
  }

  // Handle "next Monday", "this Friday", etc.
  const dayPattern = /^(next|this)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i
  const dayMatch = input.match(dayPattern)
  if (dayMatch) {
    const modifier = dayMatch[1]?.toLowerCase()
    const targetDay = DAY_NAMES.indexOf(dayMatch[2].toLowerCase())
    const currentDay = today.getDay()
    let daysUntil = targetDay - currentDay

    if (modifier === 'next') {
      // Next week's occurrence
      daysUntil = daysUntil <= 0 ? daysUntil + 7 : daysUntil
      if (daysUntil === 0) daysUntil = 7
    } else {
      // This week or next occurrence
      if (daysUntil <= 0) daysUntil += 7
    }

    const result = new Date(today)
    result.setDate(result.getDate() + daysUntil)
    return result
  }

  // Handle "next week", "next month"
  if (input === 'next week') {
    const result = new Date(today)
    result.setDate(result.getDate() + 7)
    return result
  }

  if (input === 'next month') {
    const result = new Date(today)
    result.setMonth(result.getMonth() + 1)
    return result
  }

  // Handle "end of week" (Saturday)
  if (input === 'end of week' || input === 'end of the week') {
    const result = new Date(today)
    const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7
    result.setDate(result.getDate() + daysUntilSaturday)
    return result
  }

  // Handle "end of month"
  if (input === 'end of month' || input === 'end of the month') {
    const result = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    return result
  }

  // Handle specific dates like "January 15", "Jan 15", "15th January"
  const monthDayPattern = /^(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$/i
  const dayMonthPattern = /^(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?$/i

  const mdMatch = input.match(monthDayPattern)
  const dmMatch = input.match(dayMonthPattern)

  if (mdMatch || dmMatch) {
    const day = parseInt(mdMatch ? mdMatch[1] : dmMatch![2])
    const monthStr = (mdMatch ? mdMatch[2] : dmMatch![1]).toLowerCase()
    const month = MONTH_NAMES.findIndex(m => m.startsWith(monthStr.slice(0, 3)))

    if (month !== -1 && day >= 1 && day <= 31) {
      let year = today.getFullYear()
      const result = new Date(year, month, day)

      // If the date has passed this year, assume next year
      if (result < today) {
        year++
        result.setFullYear(year)
      }

      return result
    }
  }

  // Handle ISO format YYYY-MM-DD (must be parsed as local date, not UTC)
  const isoPattern = /^(\d{4})-(\d{2})-(\d{2})$/
  const isoMatch = input.match(isoPattern)
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]))
  }

  // Handle MM/DD, MM-DD, or DD/MM formats
  const slashPattern = /^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/
  const slashMatch = input.match(slashPattern)
  if (slashMatch) {
    // Assume US format MM/DD
    let month = parseInt(slashMatch[1]) - 1
    let day = parseInt(slashMatch[2])
    let year = slashMatch[3] ? parseInt(slashMatch[3]) : today.getFullYear()

    if (year < 100) {
      year += 2000
    }

    // Validate and adjust if needed
    if (month > 11) {
      // Likely DD/MM format
      [month, day] = [day - 1, month + 1]
    }

    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const result = new Date(year, month, day)

      // If no year specified and date has passed, use next year
      if (!slashMatch[3] && result < today) {
        result.setFullYear(result.getFullYear() + 1)
      }

      return result
    }
  }

  // Fallback: try native Date parsing
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    return parsed
  }

  // If all else fails, return today
  return today
}

/**
 * Parse a natural language time string into hours and minutes
 */
export function parseNaturalTime(timeStr: string): { hours: number; minutes: number } | null {
  const input = timeStr.toLowerCase().trim()

  // Handle "now", "noon", "midnight"
  if (input === 'now') {
    const now = new Date()
    return { hours: now.getHours(), minutes: now.getMinutes() }
  }

  if (input === 'noon') {
    return { hours: 12, minutes: 0 }
  }

  if (input === 'midnight') {
    return { hours: 0, minutes: 0 }
  }

  // Handle "in X hours/minutes"
  const inPattern = /^in\s+(\d+)\s*(hour|hours|hr|hrs|minute|minutes|min|mins)$/i
  const inMatch = input.match(inPattern)
  if (inMatch) {
    const amount = parseInt(inMatch[1])
    const unit = inMatch[2].toLowerCase()
    const now = new Date()

    if (unit.startsWith('hour') || unit.startsWith('hr')) {
      now.setHours(now.getHours() + amount)
    } else {
      now.setMinutes(now.getMinutes() + amount)
    }

    return { hours: now.getHours(), minutes: now.getMinutes() }
  }

  // Handle "half past X", "quarter to X", "quarter past X"
  const halfPastPattern = /^half\s+past\s+(\d{1,2})$/i
  const quarterPastPattern = /^quarter\s+past\s+(\d{1,2})$/i
  const quarterToPattern = /^quarter\s+to\s+(\d{1,2})$/i

  const halfMatch = input.match(halfPastPattern)
  if (halfMatch) {
    return { hours: parseInt(halfMatch[1]), minutes: 30 }
  }

  const qPastMatch = input.match(quarterPastPattern)
  if (qPastMatch) {
    return { hours: parseInt(qPastMatch[1]), minutes: 15 }
  }

  const qToMatch = input.match(quarterToPattern)
  if (qToMatch) {
    const hour = parseInt(qToMatch[1]) - 1
    return { hours: hour < 0 ? 23 : hour, minutes: 45 }
  }

  // Handle standard time formats: "3pm", "3:00 PM", "15:00", "3:30pm"
  const timePattern = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/i
  const timeMatch = input.match(timePattern)

  if (timeMatch) {
    let hours = parseInt(timeMatch[1])
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0
    const period = timeMatch[3]?.toLowerCase().replace('.', '')

    if (period === 'pm' && hours < 12) {
      hours += 12
    } else if (period === 'am' && hours === 12) {
      hours = 0
    }

    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return { hours, minutes }
    }
  }

  return null
}

/**
 * Parse combined date and time from natural language
 */
export function parseDateTime(dateStr: string, timeStr: string, referenceDate?: Date): Date {
  const date = parseNaturalDate(dateStr, referenceDate)
  const time = parseNaturalTime(timeStr)

  if (time) {
    date.setHours(time.hours, time.minutes, 0, 0)
  }

  return date
}

/**
 * Parse a combined date/time string like "tomorrow at 3pm"
 */
export function parseNaturalDateTime(input: string, referenceDate?: Date): ParsedDateTime {
  const normalized = input.toLowerCase().trim()

  // Try to split by common separators
  const atPattern = /^(.+?)\s+(?:at|@)\s+(.+)$/i
  const atMatch = normalized.match(atPattern)

  if (atMatch) {
    const date = parseNaturalDate(atMatch[1], referenceDate)
    const time = parseNaturalTime(atMatch[2])

    if (time) {
      date.setHours(time.hours, time.minutes, 0, 0)
      return { date, hasTime: true, confidence: 'high' }
    }

    return { date, hasTime: false, confidence: 'medium' }
  }

  // Check if it looks like just a time
  const timeOnly = parseNaturalTime(normalized)
  if (timeOnly) {
    const date = referenceDate ? new Date(referenceDate) : new Date()
    date.setHours(timeOnly.hours, timeOnly.minutes, 0, 0)

    // If time has passed today, assume tomorrow
    if (date < new Date()) {
      date.setDate(date.getDate() + 1)
    }

    return { date, hasTime: true, confidence: 'medium' }
  }

  // Check if it looks like just a date
  const dateOnly = parseNaturalDate(normalized, referenceDate)
  return { date: dateOnly, hasTime: false, confidence: 'medium' }
}

/**
 * Format a Date object to a readable string
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Get the ISO date string (YYYY-MM-DD) from a Date
 */
export function toISODateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Get the time string (HH:MM) from a Date
 */
export function toTimeString(date: Date): string {
  return date.toTimeString().slice(0, 5)
}
