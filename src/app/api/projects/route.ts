import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Project, CreateProjectInput } from '@/types/projects'

function transformProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    color: (row.color as string) || '#6366f1',
    icon: (row.icon as string) || 'folder',
    parentProjectId: row.parent_project_id as string | undefined,
    status: row.status as Project['status'],
    sortOrder: (row.sort_order as number) || 0,
    isTemplate: (row.is_template as boolean) || false,
    templateData: (row.template_data as Record<string, unknown>) || {},
    metadata: (row.metadata as Record<string, unknown>) || {},
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
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_template', false)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Build tree structure
  const projects = (data || []).map(transformProject)
  const rootProjects = projects.filter(p => !p.parentProjectId)
  const childMap = new Map<string, Project[]>()

  for (const p of projects) {
    if (p.parentProjectId) {
      const children = childMap.get(p.parentProjectId) || []
      children.push(p)
      childMap.set(p.parentProjectId, children)
    }
  }

  for (const root of rootProjects) {
    root.children = childMap.get(root.id) || []
  }

  return NextResponse.json({ data: rootProjects })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: CreateProjectInput = await request.json()

  if (!body.name || body.name.trim() === '') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      name: body.name.trim(),
      description: body.description,
      color: body.color || '#6366f1',
      icon: body.icon || 'folder',
      parent_project_id: body.parentProjectId,
      is_template: body.isTemplate || false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: transformProject(data) })
}
