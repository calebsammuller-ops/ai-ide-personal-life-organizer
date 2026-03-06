import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

function transformSavedView(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    config: row.config as Record<string, unknown>,
    viewType: row.view_type as string,
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
    .from('saved_views')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: (data || []).map(transformSavedView) })
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

  const { data, error } = await supabase
    .from('saved_views')
    .insert({
      user_id: user.id,
      name: body.name.trim(),
      config: body.config || {},
      view_type: body.viewType || 'custom',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: transformSavedView(data) })
}
