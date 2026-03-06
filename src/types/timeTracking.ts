// Time Tracking Types

export interface TimeEntry {
  id: string
  userId: string
  taskId: string
  startTime: string
  endTime?: string
  durationSeconds?: number
  description?: string
  isRunning: boolean
  createdAt: string
  updatedAt: string
  // Joined
  taskTitle?: string
}

export interface CreateTimeEntryInput {
  taskId?: string
  startTime?: string
  endTime?: string
  durationSeconds?: number
  description?: string
}

export interface TimeReport {
  date: string
  totalSeconds: number
  entries: TimeEntry[]
}

export interface TimesheetEntry {
  taskId: string
  taskTitle: string
  projectName?: string
  dailySeconds: Record<string, number> // { '2026-02-08': 3600, ... }
  totalSeconds: number
}
