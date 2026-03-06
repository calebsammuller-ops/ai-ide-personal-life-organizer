import type { CalendarEvent, Habit, MealPlan, TimeBlock, UserPreferences, Task, FocusBlock } from '@/types'
import type { LearnedPatterns } from '@/state/slices/preferencesSlice'

export interface PlanInput {
  date: string
  preferences: Partial<UserPreferences>
  events: CalendarEvent[]
  habits: Habit[]
  meals: MealPlan[]
  tasks?: Task[]
  focusBlocks?: FocusBlock[]
  learnedPatterns?: LearnedPatterns | null
}

interface TimeBoundaries {
  dayStart: string
  dayEnd: string
  workStart: string
  workEnd: string
  preferredHours?: string[]
}

export function generateDailyPlan(input: PlanInput): TimeBlock[] {
  const { date, preferences, events, habits, meals, tasks = [], focusBlocks = [], learnedPatterns } = input

  // Parse user boundaries
  const dayStart = preferences.wakeTime || '07:00'
  const dayEnd = preferences.sleepTime || '23:00'
  const workStart = preferences.workStartTime || '09:00'
  const workEnd = preferences.workEndTime || '17:00'

  const boundaries: TimeBoundaries = {
    dayStart,
    dayEnd,
    workStart,
    workEnd,
    preferredHours: learnedPatterns?.mostProductiveHours,
  }

  const mealTimes = preferences.preferredMealTimes || {
    breakfast: '08:00',
    lunch: '12:30',
    dinner: '19:00',
  }

  // Step 1: Place fixed calendar events (highest priority)
  const eventBlocks: TimeBlock[] = events
    .filter(e => e.status !== 'cancelled')
    .map(e => ({
      startTime: formatTime(new Date(e.startTime as string)),
      endTime: formatTime(new Date(e.endTime as string)),
      type: 'event' as const,
      title: e.title,
      referenceId: e.id,
      color: getCategoryColor(e.category),
    }))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  // Step 2: Place focus blocks (protected time)
  const dayOfWeek = new Date(date).getDay()
  const focusBlockItems: TimeBlock[] = focusBlocks
    .filter(fb => fb.isActive && fb.daysOfWeek.includes(dayOfWeek))
    .map(fb => ({
      startTime: fb.startTime,
      endTime: fb.endTime,
      type: 'focus' as const,
      title: fb.title,
      focusBlockId: fb.id,
      color: fb.color,
      isProtected: fb.isProtected,
    }))

  // Step 3: Place meals at preferred times
  const mealBlocks = placeMeals(meals, mealTimes, [...eventBlocks, ...focusBlockItems])

  // Step 4: Place habits in available slots
  const occupiedBlocks = [...eventBlocks, ...focusBlockItems, ...mealBlocks]
  const habitBlocks = placeHabits(habits, date, occupiedBlocks, boundaries)

  // Step 5: Place scheduled tasks
  const taskBlocks: TimeBlock[] = tasks
    .filter(t => t.status === 'scheduled' && t.scheduledStart && t.scheduledEnd)
    .filter(t => {
      const taskDate = new Date(t.scheduledStart!).toISOString().split('T')[0]
      return taskDate === date
    })
    .map(t => ({
      startTime: formatTime(new Date(t.scheduledStart!)),
      endTime: formatTime(new Date(t.scheduledEnd!)),
      type: 'task' as const,
      title: t.title,
      taskId: t.id,
      referenceId: t.id,
      priority: t.priority,
      energyLevel: t.energyLevel,
      color: getPriorityColor(t.priority),
    }))

  // Step 6: Combine all blocks
  const allBlocks = [...eventBlocks, ...focusBlockItems, ...mealBlocks, ...habitBlocks, ...taskBlocks]
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  // Step 5: Identify free time blocks
  const freeBlocks = identifyFreeTime(allBlocks, dayStart, dayEnd)

  // Step 6: Insert breaks during work hours
  const breakBlocks = insertBreaks(allBlocks, workStart, workEnd)

  // Combine and sort all blocks
  return [...allBlocks, ...freeBlocks, ...breakBlocks]
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

function placeMeals(
  meals: MealPlan[],
  preferredTimes: { breakfast: string; lunch: string; dinner: string },
  occupiedBlocks: TimeBlock[]
): TimeBlock[] {
  const mealBlocks: TimeBlock[] = []
  const mealTypeOrder: ('breakfast' | 'lunch' | 'dinner' | 'snack')[] =
    ['breakfast', 'lunch', 'dinner', 'snack']

  const defaultTimes: Record<string, string> = {
    breakfast: preferredTimes.breakfast,
    lunch: preferredTimes.lunch,
    dinner: preferredTimes.dinner,
    snack: '15:00',
  }

  for (const mealType of mealTypeOrder) {
    const meal = meals.find(m => m.mealType === mealType)
    if (!meal) continue

    const preferredTime = defaultTimes[mealType]
    const duration = Math.max(
      30,
      (meal.prepTimeMinutes || 0) + (meal.cookTimeMinutes || 0) + 20
    )

    // Find available slot near preferred time
    const slot = findAvailableSlotNear(
      preferredTime,
      duration,
      [...occupiedBlocks, ...mealBlocks]
    )

    if (slot) {
      mealBlocks.push({
        startTime: slot.start,
        endTime: slot.end,
        type: 'meal',
        title: `${getMealEmoji(mealType)} ${meal.name}`,
        referenceId: meal.id,
        color: '#f59e0b',
      })
    }
  }

  return mealBlocks
}

function placeHabits(
  habits: Habit[],
  date: string,
  occupiedBlocks: TimeBlock[],
  boundaries: TimeBoundaries
): TimeBlock[] {
  const habitBlocks: TimeBlock[] = []
  const dayOfWeek = new Date(date).getDay()

  // Sort habits by priority (those with reminder times first)
  const sortedHabits = [...habits].sort((a, b) => {
    if (a.reminderTime && !b.reminderTime) return -1
    if (!a.reminderTime && b.reminderTime) return 1
    return 0
  })

  for (const habit of sortedHabits) {
    // Check if habit should be done on this day
    if (!shouldDoHabitOnDay(habit, dayOfWeek)) continue

    // Find preferred time slot
    const preferredTime = habit.reminderTime || getDefaultHabitTime(boundaries)
    const duration = estimateHabitDuration(habit)

    // Find available slot near preferred time
    const slot = findAvailableSlot(
      preferredTime,
      duration,
      [...occupiedBlocks, ...habitBlocks],
      boundaries
    )

    if (slot) {
      habitBlocks.push({
        startTime: slot.start,
        endTime: slot.end,
        type: 'habit',
        title: `${habit.icon} ${habit.name}`,
        referenceId: habit.id,
        color: habit.color,
      })
    }
  }

  return habitBlocks
}

function identifyFreeTime(blocks: TimeBlock[], dayStart: string, dayEnd: string): TimeBlock[] {
  const freeBlocks: TimeBlock[] = []
  let currentTime = dayStart

  for (const block of blocks) {
    if (block.startTime > currentTime) {
      const gapMinutes = timeDiffMinutes(currentTime, block.startTime)
      if (gapMinutes >= 30) {
        freeBlocks.push({
          startTime: currentTime,
          endTime: block.startTime,
          type: 'free',
          title: 'Free Time',
          color: '#e5e7eb',
        })
      }
    }
    if (block.endTime > currentTime) {
      currentTime = block.endTime
    }
  }

  // Add remaining time until end of day
  if (currentTime < dayEnd) {
    const remainingMinutes = timeDiffMinutes(currentTime, dayEnd)
    if (remainingMinutes >= 30) {
      freeBlocks.push({
        startTime: currentTime,
        endTime: dayEnd,
        type: 'free',
        title: 'Free Time',
        color: '#e5e7eb',
      })
    }
  }

  return freeBlocks
}

function insertBreaks(blocks: TimeBlock[], workStart: string, workEnd: string): TimeBlock[] {
  const breakBlocks: TimeBlock[] = []

  // Find work blocks (events during work hours)
  const workBlocks = blocks.filter(b =>
    b.startTime >= workStart &&
    b.endTime <= workEnd &&
    b.type === 'event'
  )

  if (workBlocks.length < 2) return breakBlocks

  // Insert breaks between consecutive work blocks
  let consecutiveWork = 0
  for (let i = 0; i < workBlocks.length - 1; i++) {
    const currentBlock = workBlocks[i]
    const nextBlock = workBlocks[i + 1]
    const gap = timeDiffMinutes(currentBlock.endTime, nextBlock.startTime)
    consecutiveWork += timeDiffMinutes(currentBlock.startTime, currentBlock.endTime)

    // Add break if worked 90+ minutes and there's a gap
    if (consecutiveWork >= 90 && gap >= 10) {
      breakBlocks.push({
        startTime: currentBlock.endTime,
        endTime: addMinutes(currentBlock.endTime, Math.min(10, gap)),
        type: 'break',
        title: 'Short Break',
        color: '#86efac',
      })
      consecutiveWork = 0
    }
  }

  return breakBlocks
}

// Helper functions
function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5)
}

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

function timeToString(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

function timeDiffMinutes(start: string, end: string): number {
  return parseTime(end) - parseTime(start)
}

function addMinutes(time: string, minutes: number): string {
  const totalMinutes = parseTime(time) + minutes
  return timeToString(totalMinutes)
}

function shouldDoHabitOnDay(habit: Habit, dayOfWeek: number): boolean {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

  if (habit.frequency === 'daily') return true

  if (habit.frequency === 'weekly') {
    const startDay = new Date(habit.startDate).getDay()
    return dayOfWeek === startDay
  }

  if (habit.frequency === 'custom' && habit.frequencyConfig) {
    const config = habit.frequencyConfig as { days?: string[] }
    if (config.days) {
      return config.days.includes(dayNames[dayOfWeek])
    }
  }

  return true
}

function estimateHabitDuration(habit: Habit): number {
  // Default 30 minutes, adjust based on category
  const categoryDurations: Record<string, number> = {
    exercise: 45,
    meditation: 20,
    reading: 30,
    learning: 45,
    health: 15,
    productivity: 30,
  }

  return categoryDurations[habit.category?.toLowerCase() || ''] || 30
}

function getDefaultHabitTime(boundaries: TimeBoundaries): string {
  // Default to morning before work
  if (boundaries.preferredHours && boundaries.preferredHours.length > 0) {
    return boundaries.preferredHours[0]
  }
  return boundaries.workStart
}

function findAvailableSlot(
  preferredTime: string,
  durationMinutes: number,
  occupiedBlocks: TimeBlock[],
  boundaries: TimeBoundaries
): { start: string; end: string } | null {
  const sortedBlocks = [...occupiedBlocks].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  )

  // Try the preferred time first
  const preferredSlot = checkSlotAvailability(
    preferredTime,
    durationMinutes,
    sortedBlocks,
    boundaries
  )
  if (preferredSlot) return preferredSlot

  // Search forward from preferred time
  let searchTime = preferredTime
  while (searchTime < boundaries.dayEnd) {
    const slot = checkSlotAvailability(searchTime, durationMinutes, sortedBlocks, boundaries)
    if (slot) return slot
    searchTime = addMinutes(searchTime, 30)
  }

  // Search backward from preferred time
  searchTime = addMinutes(preferredTime, -30)
  while (searchTime >= boundaries.dayStart) {
    const slot = checkSlotAvailability(searchTime, durationMinutes, sortedBlocks, boundaries)
    if (slot) return slot
    searchTime = addMinutes(searchTime, -30)
  }

  return null
}

function findAvailableSlotNear(
  preferredTime: string,
  durationMinutes: number,
  occupiedBlocks: TimeBlock[]
): { start: string; end: string } | null {
  const sortedBlocks = [...occupiedBlocks].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  )

  const endTime = addMinutes(preferredTime, durationMinutes)

  // Check if preferred slot is available
  const hasConflict = sortedBlocks.some(block => {
    return preferredTime < block.endTime && endTime > block.startTime
  })

  if (!hasConflict) {
    return { start: preferredTime, end: endTime }
  }

  // Try 30 min earlier or later
  for (const offset of [30, -30, 60, -60]) {
    const altStart = addMinutes(preferredTime, offset)
    const altEnd = addMinutes(altStart, durationMinutes)

    const altConflict = sortedBlocks.some(block => {
      return altStart < block.endTime && altEnd > block.startTime
    })

    if (!altConflict) {
      return { start: altStart, end: altEnd }
    }
  }

  return null
}

function checkSlotAvailability(
  startTime: string,
  durationMinutes: number,
  occupiedBlocks: TimeBlock[],
  boundaries: TimeBoundaries
): { start: string; end: string } | null {
  const endTime = addMinutes(startTime, durationMinutes)

  // Check boundaries
  if (startTime < boundaries.dayStart || endTime > boundaries.dayEnd) {
    return null
  }

  // Check for conflicts
  const hasConflict = occupiedBlocks.some(block => {
    return startTime < block.endTime && endTime > block.startTime
  })

  if (!hasConflict) {
    return { start: startTime, end: endTime }
  }

  return null
}

function getCategoryColor(category?: string): string {
  const colors: Record<string, string> = {
    work: '#3b82f6',
    meeting: '#8b5cf6',
    personal: '#10b981',
    health: '#ef4444',
    social: '#f59e0b',
    learning: '#06b6d4',
  }
  return colors[category?.toLowerCase() || ''] || '#6b7280'
}

function getPriorityColor(priority: number): string {
  const colors: Record<number, string> = {
    1: '#ef4444', // red - urgent
    2: '#f97316', // orange - high
    3: '#eab308', // yellow - medium
    4: '#3b82f6', // blue - low
    5: '#9ca3af', // gray - lowest
  }
  return colors[priority] || '#6b7280'
}

function getMealEmoji(mealType: string): string {
  const emojis: Record<string, string> = {
    breakfast: '🌅',
    lunch: '🥗',
    dinner: '🍽️',
    snack: '🍎',
  }
  return emojis[mealType] || '🍴'
}
