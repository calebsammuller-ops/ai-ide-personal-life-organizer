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

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: (data || []).map(transformRule) })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  if (!body.name || body.name.trim() === '') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  if (!body.triggerType) {
    return NextResponse.json({ error: 'Trigger type is required' }, { status: 400 })
  }

  if (!body.actionType) {
    return NextResponse.json({ error: 'Action type is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('automation_rules')
    .insert({
      user_id: user.id,
      name: body.name.trim(),
      trigger_type: body.triggerType,
      conditions: body.conditions || {},
      action_type: body.actionType,
      action_config: body.actionConfig || {},
      is_active: body.isActive ?? true,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: transformRule(data) })
}
