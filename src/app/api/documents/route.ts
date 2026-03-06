import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface Document {
  id: string
  userId: string
  title: string
  content: unknown
  plainText: string | null
  projectId: string | null
  isPinned: boolean
  createdAt: string
  updatedAt: string
}

function transformDocument(row: Record<string, unknown>): Document {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    content: row.content,
    plainText: row.plain_text as string | null,
    projectId: row.project_id as string | null,
    isPinned: (row.is_pinned as boolean) || false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  let query = supabase
    .from('documents')
    .select('id, title, content, plain_text, project_id, is_pinned, created_at, updated_at, user_id')
    .eq('user_id', user.id)
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: (data || []).map(transformDocument) })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  if (!body.title || body.title.trim() === '') {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('documents')
    .insert({
      user_id: user.id,
      title: body.title.trim(),
      content: body.content || {},
      plain_text: body.plainText || '',
      project_id: body.projectId || null,
      is_pinned: body.isPinned || false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: transformDocument(data) })
}
