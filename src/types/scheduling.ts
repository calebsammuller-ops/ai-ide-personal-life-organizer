// Motion AI Scheduling Types

// Task entity - distinct from CalendarEvent
// Tasks represent work to be done with deadlines and duration estimates
export interface Task {
  id: string
  userId: string
  title: string
  description?: string
  // Scheduling
  deadline?: Date | string
  durationMinutes: number
  scheduledStart?: Date | string
  scheduledEnd?: Date | string
  // Classification
  priority: 1 | 2 | 3 | 4 | 5
  energyLevel?: 'low' | 'medium' | 'high'
  category?: string
  tags: string[]
  // Status
  status: TaskStatus
  isAutoScheduled: boolean
  // Links
  linkedCalendarEventId?: string
  linkedHabitId?: string
  // Tracking
  rescheduleCount: number
  completedAt?: Date | string
  // Project & hierarchy
  projectId?: string
  parentTaskId?: string
  sortOrder: number
  completionPercentage: number
  isMilestone: boolean
  // Metadata
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type TaskStatus =
  | 'pending'      // Not yet scheduled
  | 'scheduled'    // Has a time slot assigned
  | 'in_progress'  // Currently being worked on
  | 'completed'    // Done
  | 'cancelled'    // Removed
  | 'deferred'     // Pushed to later

// Focus Block - protected time for deep work
export interface FocusBlock {
  id: string
  userId: string
  title: string
  // Time (recurring - stored as HH:MM)
  startTime: string
  endTime: string
  // Which days (0=Sunday, 1=Monday, etc.)
  daysOfWeek: number[]
  // Protection settings
  isProtected: boolean
  allowHighPriorityOverride: boolean
  bufferMinutes: number
  // Activity preferences
  preferredTaskTypes: string[]
  blockedCategories: string[]
  // Status
  isActive: boolean
  // Appearance
  color: string
  // Metadata
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt?: string
}

// Scheduling preferences (extends UserPreferences)
export interface SchedulingPreferences {
  peakProductivityHours: string[]   // Hours when user is most productive
  lowEnergyHours: string[]          // Hours when energy is lower
  defaultTaskDuration: number       // Default minutes for new tasks
  autoScheduleEnabled: boolean      // Auto-schedule new tasks
  smartRescheduleEnabled: boolean   // Auto-reschedule incomplete tasks
  bufferBetweenTasks: number        // Minutes buffer between tasks
  maxFocusSessionMinutes: number    // Max focus session length
  preferredBreakDuration: number    // Preferred break length
}

// Context passed to scheduling engine
export interface SchedulingContext {
  date: string                      // Date being scheduled
  events: ScheduleItem[]            // Existing calendar events
  tasks: Task[]                     // Tasks to consider
  focusBlocks: FocusBlock[]         // Focus blocks for the day
  preferences: SchedulingPreferences
  dayBoundaries: DayBoundaries
}

export interface DayBoundaries {
  dayStart: string                  // Wake time (HH:MM)
  dayEnd: string                    // Sleep time (HH:MM)
  workStart: string                 // Work start (HH:MM)
  workEnd: string                   // Work end (HH:MM)
}

// Generic scheduled item (event or task)
export interface ScheduleItem {
  id: string
  type: 'event' | 'task' | 'focus' | 'meal' | 'habit'
  title: string
  startTime: string
  endTime: string
  priority?: number
  energyLevel?: 'low' | 'medium' | 'high'
  isProtected?: boolean
}

// Available time slot
export interface ScheduleSlot {
  start: Date
  end: Date
  durationMinutes: number
  type: 'available' | 'focus' | 'busy' | 'buffer'
  energyLevel?: 'low' | 'medium' | 'high'
  isProtected?: boolean
  score?: number                    // Suitability score for scheduling
}

// AI scheduling suggestion
export interface SchedulingSuggestion {
  taskId: string
  task: Task
  proposedStart: Date
  proposedEnd: Date
  confidence: number                // 0-1 confidence score
  reason: string                    // Human-readable explanation
  factors: SchedulingFactor[]       // Factors that influenced decision
  alternativeSlots?: AlternativeSlot[]
}

export interface SchedulingFactor {
  name: string
  score: number
  weight: number
  description: string
}

export interface AlternativeSlot {
  start: Date
  end: Date
  score: number
  reason: string
}

// Result of rescheduling operation
export interface RescheduleResult {
  success: boolean
  rescheduledItems: RescheduledItem[]
  conflicts?: ConflictInfo[]
  warnings: string[]
  totalItemsAffected: number
}

export interface RescheduledItem {
  id: string
  type: 'task' | 'event'
  title: string
  oldStart: Date
  oldEnd: Date
  newStart: Date
  newEnd: Date
  reason: string
}

// Conflict information
export interface ConflictInfo {
  type: 'overlap' | 'deadline_violation' | 'focus_block_violation' | 'boundary_violation'
  severity: 'low' | 'medium' | 'high'
  affectedItems: string[]
  description: string
  suggestedResolution?: string
}

// Batch scheduling request
export interface BatchScheduleRequest {
  taskIds: string[]
  options?: BatchScheduleOptions
}

export interface BatchScheduleOptions {
  respectPriority: boolean          // Schedule high priority first
  optimizeForDeadlines: boolean     // Prioritize deadline proximity
  allowRescheduling: boolean        // Can move existing scheduled items
  dateRange?: {
    start: string
    end: string
  }
}

// Batch scheduling result
export interface BatchScheduleResult {
  success: boolean
  scheduled: SchedulingSuggestion[]
  failed: {
    taskId: string
    reason: string
  }[]
  warnings: string[]
}

// Task creation input
export interface CreateTaskInput {
  title: string
  description?: string
  deadline?: string
  durationMinutes?: number
  priority?: 1 | 2 | 3 | 4 | 5
  energyLevel?: 'low' | 'medium' | 'high'
  category?: string
  tags?: string[]
  isAutoScheduled?: boolean
  projectId?: string
  parentTaskId?: string
  isMilestone?: boolean
}

// Task update input
export interface UpdateTaskInput {
  title?: string
  description?: string
  deadline?: string
  durationMinutes?: number
  scheduledStart?: string
  scheduledEnd?: string
  priority?: 1 | 2 | 3 | 4 | 5
  energyLevel?: 'low' | 'medium' | 'high'
  category?: string
  tags?: string[]
  status?: TaskStatus
  isAutoScheduled?: boolean
  projectId?: string
  parentTaskId?: string
  sortOrder?: number
  completionPercentage?: number
  isMilestone?: boolean
}

// Focus block creation input
export interface CreateFocusBlockInput {
  title?: string
  startTime: string
  endTime: string
  daysOfWeek?: number[]
  isProtected?: boolean
  allowHighPriorityOverride?: boolean
  bufferMinutes?: number
  preferredTaskTypes?: string[]
  blockedCategories?: string[]
  color?: string
}

// Focus block update input
export interface UpdateFocusBlockInput {
  title?: string
  startTime?: string
  endTime?: string
  daysOfWeek?: number[]
  isProtected?: boolean
  allowHighPriorityOverride?: boolean
  bufferMinutes?: number
  preferredTaskTypes?: string[]
  blockedCategories?: string[]
  isActive?: boolean
  color?: string
}

// Scheduling history for learning
export interface SchedulingHistoryEntry {
  id: string
  userId: string
  taskId?: string
  eventId?: string
  actionType: 'auto_schedule' | 'reschedule' | 'manual_move' | 'complete' | 'defer' | 'cancel'
  originalStart?: Date
  originalEnd?: Date
  newStart?: Date
  newEnd?: Date
  reason?: string
  wasAiSuggested: boolean
  userAccepted?: boolean
  completionTimeActual?: number
  estimatedVsActualDiff?: number
  context?: Record<string, unknown>
  createdAt: string
}

// Energy mapping for time of day
export interface EnergyMapping {
  hour: number
  energyLevel: 'low' | 'medium' | 'high'
  isProductiveHour: boolean
}
