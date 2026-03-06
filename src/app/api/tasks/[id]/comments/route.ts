import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('task_comments')
    .select('*')
    .eq('task_id', params.id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data: (data || []).map(c => ({
      id: c.id,
      userId: c.user_id,
      taskId: c.task_id,
      content: c.content,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    })),
  })
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { content } = await request.json()

  if (!content || !content.trim()) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('task_comments')
    .insert({ user_id: user.id, task_id: params.id, content: content.trim() })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log activity
  await supabase.from('task_activity').insert({
    user_id: user.id,
    task_id: params.id,
    action: 'comment_added',
    details: { commentId: data.id },
  })

  return NextResponse.json({
    data: { id: data.id, userId: data.user_id, taskId: data.task_id, content: data.content, createdAt: data.created_at, updatedAt: data.updated_at },
  })
}
