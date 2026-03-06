import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/tasks/cleanup-orphaned
 * Removes tasks that are linked to habits that no longer exist.
 * This cleans up orphaned tasks from habits that were deleted before
 * the cascade delete fix was implemented.
 */
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get all habit-linked tasks for this user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: habitTasks, error: tasksError } = await (supabase as any)
    .from('tasks')
    .select('id, category')
    .eq('user_id', user.id)
    .like('category', 'habit:%') as {
      data: Array<{ id: string; category: string }> | null
      error: Error | null
    }

  if (tasksError || !habitTasks) {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }

  if (habitTasks.length === 0) {
    return NextResponse.json({ message: 'No habit tasks found', deletedCount: 0 })
  }

  // Extract unique habit IDs from task categories
  const habitIds = [...new Set(
    habitTasks
      .map(t => t.category?.match(/^habit:(.+)$/)?.[1])
      .filter(Boolean)
  )] as string[]

  if (habitIds.length === 0) {
    return NextResponse.json({ message: 'No habit-linked tasks found', deletedCount: 0 })
  }

  // Check which habits still exist
  const { data: existingHabits, error: habitsError } = await supabase
    .from('habits')
    .select('id')
    .eq('user_id', user.id)
    .in('id', habitIds)

  if (habitsError) {
    return NextResponse.json({ error: 'Failed to fetch habits' }, { status: 500 })
  }

  const existingHabitIds = new Set((existingHabits || []).map(h => h.id))

  // Find orphaned habit IDs (habits that no longer exist)
  const orphanedHabitIds = habitIds.filter(id => !existingHabitIds.has(id))

  if (orphanedHabitIds.length === 0) {
    return NextResponse.json({ message: 'No orphaned tasks found', deletedCount: 0 })
  }

  // Delete tasks for orphaned habits
  let deletedCount = 0
  for (const habitId of orphanedHabitIds) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase as any)
      .from('tasks')
      .delete()
      .eq('user_id', user.id)
      .eq('category', `habit:${habitId}`)

    if (!deleteError) {
      const tasksForHabit = habitTasks.filter(t => t.category === `habit:${habitId}`)
      deletedCount += tasksForHabit.length
    }
  }

  return NextResponse.json({
    message: `Cleaned up ${deletedCount} orphaned tasks from ${orphanedHabitIds.length} deleted habits`,
    deletedCount,
    orphanedHabitIds,
  })
}
