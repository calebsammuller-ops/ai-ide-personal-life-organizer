import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('task_dependencies')
    .select('*, tasks!task_dependencies_depends_on_task_id_fkey(title)')
    .eq('task_id', params.id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data: (data || []).map(d => ({
      id: d.id,
      userId: d.user_id,
      taskId: d.task_id,
      dependsOnTaskId: d.depends_on_task_id,
      dependencyType: d.dependency_type,
      dependsOnTaskTitle: d.tasks?.title,
      createdAt: d.created_at,
    })),
  })
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { dependsOnTaskId, dependencyType } = await request.json()

  if (!dependsOnTaskId) {
    return NextResponse.json({ error: 'dependsOnTaskId is required' }, { status: 400 })
  }

  if (dependsOnTaskId === params.id) {
    return NextResponse.json({ error: 'A task cannot depend on itself' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('task_dependencies')
    .insert({
      user_id: user.id,
      task_id: params.id,
      depends_on_task_id: dependsOnTaskId,
      dependency_type: dependencyType || 'blocks',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const dependencyId = searchParams.get('dependencyId')

  if (!dependencyId) {
    return NextResponse.json({ error: 'dependencyId is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('task_dependencies')
    .delete()
    .eq('id', dependencyId)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
