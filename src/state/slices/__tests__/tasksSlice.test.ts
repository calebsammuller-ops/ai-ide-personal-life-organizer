/**
 * Tests for tasksSlice selectors and reducers.
 * Verifies memoization: createSelector returns the SAME object reference
 * when inputs haven't changed.
 */

import { describe, it, expect } from 'vitest'
import tasksReducer, {
  setStatusFilter,
  setPriorityFilter,
  selectFilteredTasks,
  selectPendingTasks,
  selectHighPriorityTasks,
  selectOverdueTasks,
} from '../tasksSlice'
import type { RootState } from '../../store'
import type { Task } from '@/types/scheduling'

// Minimal task factory
function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: crypto.randomUUID(),
    userId: 'user-1',
    title: 'Test task',
    durationMinutes: 30,
    priority: 3,
    status: 'pending',
    tags: [],
    isAutoScheduled: false,
    rescheduleCount: 0,
    sortOrder: 0,
    completionPercentage: 0,
    isMilestone: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

const pendingTask = makeTask({ status: 'pending', priority: 3 })
const completedTask = makeTask({ status: 'completed', priority: 2 })
const highPriorityTask = makeTask({ status: 'pending', priority: 1 })
const overdueTask = makeTask({
  status: 'pending',
  priority: 3,
  deadline: new Date(Date.now() - 86400000).toISOString(), // yesterday
})

function makeState(overrides: Partial<RootState['tasks']> = {}): RootState {
  return {
    tasks: {
      tasks: [pendingTask, completedTask, highPriorityTask, overdueTask],
      selectedTask: null,
      isLoading: false,
      isScheduling: false,
      error: null,
      schedulingSuggestions: [],
      showSchedulingModal: false,
      pendingScheduleTask: null,
      statusFilter: 'all',
      priorityFilter: null,
      dateFilter: null,
      ...overrides,
    },
  } as RootState
}

describe('selectFilteredTasks', () => {
  it('returns all tasks when no filter is set', () => {
    const state = makeState()
    const result = selectFilteredTasks(state)
    expect(result).toHaveLength(4)
  })

  it('filters by status', () => {
    const state = makeState({ statusFilter: 'completed' })
    const result = selectFilteredTasks(state)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(completedTask.id)
  })

  it('filters by priority', () => {
    const state = makeState({ priorityFilter: 1 })
    const result = selectFilteredTasks(state)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(highPriorityTask.id)
  })

  it('returns the same reference when state has not changed (memoization)', () => {
    const state = makeState()
    const first = selectFilteredTasks(state)
    const second = selectFilteredTasks(state)
    expect(first).toBe(second) // same object reference — not recomputed
  })

  it('returns a new reference when tasks array changes', () => {
    const state1 = makeState()
    const state2 = makeState({ tasks: [...state1.tasks.tasks, makeTask()] })
    const first = selectFilteredTasks(state1)
    const second = selectFilteredTasks(state2)
    expect(first).not.toBe(second)
  })
})

describe('selectPendingTasks', () => {
  it('returns only pending tasks', () => {
    const result = selectPendingTasks(makeState())
    expect(result.every(t => t.status === 'pending')).toBe(true)
  })

  it('is memoized', () => {
    const state = makeState()
    expect(selectPendingTasks(state)).toBe(selectPendingTasks(state))
  })
})

describe('selectHighPriorityTasks', () => {
  it('returns tasks with priority <= 2 that are not completed/cancelled', () => {
    const result = selectHighPriorityTasks(makeState())
    expect(result.every(t => t.priority <= 2)).toBe(true)
    expect(result.every(t => t.status !== 'completed' && t.status !== 'cancelled')).toBe(true)
    expect(result.some(t => t.id === highPriorityTask.id)).toBe(true)
    expect(result.some(t => t.id === completedTask.id)).toBe(false)
  })
})

describe('selectOverdueTasks', () => {
  it('returns tasks past their deadline that are not completed/cancelled', () => {
    const result = selectOverdueTasks(makeState())
    expect(result.some(t => t.id === overdueTask.id)).toBe(true)
    expect(result.every(t => t.deadline && new Date(t.deadline) < new Date())).toBe(true)
  })
})

describe('tasksReducer', () => {
  it('sets status filter', () => {
    const state = tasksReducer(undefined, setStatusFilter('completed'))
    expect(state.statusFilter).toBe('completed')
  })

  it('sets priority filter', () => {
    const state = tasksReducer(undefined, setPriorityFilter(2))
    expect(state.priorityFilter).toBe(2)
  })

  it('resets to default state', () => {
    const state = tasksReducer(undefined, { type: '@@INIT' })
    expect(state.statusFilter).toBe('all')
    expect(state.priorityFilter).toBeNull()
    expect(state.tasks).toHaveLength(0)
  })
})
