import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

function transformRule(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    triggerType: row.trigger_type as string,
    conditions: row.conditions as Record<string, unknown>,
    actionType: row.action_type as string,
    actionConfig: row.action_config as Record<string, unknown>,
    isActive: (row.is_active as boolean) ?? true,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json({ data: transformRule(data) })
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.name !== undefined) updates.name = body.name
  if (body.triggerType !== undefined) updates.trigger_type = body.triggerType
  if (body.conditions !== undefined) updates.conditions = body.conditions
  if (body.actionType !== undefined) updates.action_type = body.actionType
  if (body.actionConfig !== undefined) updates.action_config = body.actionConfig
  if (body.isActive !== undefined) updates.is_active = body.isActive

  const { data, error } = await supabase
    .from('automation_rules')
    .update(updates)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: transformRule(data) })
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('automation_rules')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
