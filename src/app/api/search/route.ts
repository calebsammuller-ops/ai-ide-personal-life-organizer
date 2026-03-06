import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

function transformTask(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string | null,
    status: row.status as string,
    priority: row.priority as string,
    dueDate: row.due_date as string | null,
    projectId: row.project_id as string | null,
    createdAt: row.created_at as string,
  }
}

function transformDocument(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    title: row.title as string,
    plainText: row.plain_text as string | null,
    projectId: row.project_id as string | null,
    isPinned: (row.is_pinned as boolean) || false,
    updatedAt: row.updated_at as string,
  }
}

function transformHabit(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    name: row.name as string,
    frequency: row.frequency as string,
    currentStreak: row.current_streak as number,
    createdAt: row.created_at as string,
  }
}

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')

  if (!q || q.trim() === '') {
    return NextResponse.json({ data: { tasks: [], documents: [], habits: [] } })
  }

  const searchPattern = `%${q.trim()}%`

  // Search tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, description, status, priority, due_date, project_id, created_at')
    .eq('user_id', user.id)
    .or(`title.ilike.${searchPattern},description.ilike.${searchPattern}`)
    .limit(20)

  // Search documents
  const { data: documents } = await supabase
    .from('documents')
    .select('id, title, plain_text, project_id, is_pinned, updated_at')
    .eq('user_id', user.id)
    .or(`title.ilike.${searchPattern},plain_text.ilike.${searchPattern}`)
    .limit(20)

  // Search habits
  const { data: habits } = await supabase
    .from('habits')
    .select('id, name, frequency, current_streak, created_at')
    .eq('user_id', user.id)
    .ilike('name', searchPattern)
    .limit(20)

  return NextResponse.json({
    data: {
      tasks: (tasks || []).map(transformTask),
      documents: (documents || []).map(transformDocument),
      habits: (habits || []).map(transformHabit),
    },
  })
}
