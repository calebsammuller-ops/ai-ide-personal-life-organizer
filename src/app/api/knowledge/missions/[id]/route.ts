import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.status) updates.status = body.status
    if (typeof body.sourcesProcessed === 'number') updates.sources_processed = body.sourcesProcessed
    if (typeof body.notesGenerated === 'number') updates.notes_generated = body.notesGenerated

    const { data, error } = await supabase
      .from('research_missions')
      .update(updates)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({
      id: data.id,
      status: data.status,
      sourcesProcessed: data.sources_processed,
      notesGenerated: data.notes_generated,
      updatedAt: data.updated_at,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to update mission' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await supabase.from('research_missions')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete mission' }, { status: 500 })
  }
}
