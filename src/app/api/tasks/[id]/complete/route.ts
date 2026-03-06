import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { evaluateTrigger } from '@/lib/automations/automationEngine'
import { transformTask } from '../../route'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Update task to completed status
  const { data, error } = await supabase
    .from('tasks')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Run automation triggers (fire-and-forget)
  const taskData = data as Record<string, unknown>
  evaluateTrigger({
    userId: user.id,
    triggerType: 'task_completed',
    data: {
      taskId: id,
      priority: taskData.priority as string,
      category: taskData.category as string,
      title: taskData.title as string,
    },
  }).catch((err) => console.error('Automation trigger error:', err))

  return NextResponse.json({ data: transformTask(data) })
}
