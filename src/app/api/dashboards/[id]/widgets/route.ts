import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

function transformWidget(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    dashboardId: row.dashboard_id as string,
    widgetType: row.widget_type as string,
    config: row.config as Record<string, unknown>,
    position: row.position as { x: number; y: number; w: number; h: number },
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

  // Verify dashboard belongs to user
  const { error: dashError } = await supabase
    .from('dashboards')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (dashError) {
    return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('dashboard_widgets')
    .select('*')
    .eq('dashboard_id', params.id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: (data || []).map(transformWidget) })
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify dashboard belongs to user
  const { error: dashError } = await supabase
    .from('dashboards')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (dashError) {
    return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
  }

  const body = await request.json()

  if (!body.widgetType) {
    return NextResponse.json({ error: 'Widget type is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('dashboard_widgets')
    .insert({
      dashboard_id: params.id,
      widget_type: body.widgetType,
      config: body.config || {},
      position: body.position || { x: 0, y: 0, w: 4, h: 3 },
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: transformWidget(data) })
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify dashboard belongs to user
  const { error: dashError } = await supabase
    .from('dashboards')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (dashError) {
    return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
  }

  const body = await request.json()

  if (!body.widgetId) {
    return NextResponse.json({ error: 'Widget ID is required' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.config !== undefined) updates.config = body.config
  if (body.position !== undefined) updates.position = body.position
  if (body.widgetType !== undefined) updates.widget_type = body.widgetType

  const { data, error } = await supabase
    .from('dashboard_widgets')
    .update(updates)
    .eq('id', body.widgetId)
    .eq('dashboard_id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: transformWidget(data) })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify dashboard belongs to user
  const { error: dashError } = await supabase
    .from('dashboards')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (dashError) {
    return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
  }

  const body = await request.json()

  if (!body.widgetId) {
    return NextResponse.json({ error: 'Widget ID is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('dashboard_widgets')
    .delete()
    .eq('id', body.widgetId)
    .eq('dashboard_id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
