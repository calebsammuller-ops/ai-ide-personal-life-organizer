import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, withApiHandler } from '@/lib/api/middleware'
import { computeGraphMetrics, detectClusters } from '@/lib/knowledge/graphAnalytics'
import type { User } from '@supabase/supabase-js'

export const GET = withApiHandler(withAuth(async (_request: Request, user: User) => {
  const supabase = await createClient()

  const [{ data: notes }, { data: links }] = await Promise.all([
    supabase
      .from('knowledge_notes')
      .select('id, title')
      .eq('user_id', user.id)
      .eq('is_archived', false),
    supabase
      .from('knowledge_links')
      .select('source_note_id, target_note_id')
      .eq('user_id', user.id),
  ])

  const nodeList = (notes || []).map(n => ({ id: n.id as string, title: n.title as string }))
  const linkList = (links || []).map(l => ({
    sourceNoteId: l.source_note_id as string,
    targetNoteId: l.target_note_id as string,
  }))

  const metrics = computeGraphMetrics(nodeList, linkList)
  const clusters = detectClusters(nodeList, linkList)

  return NextResponse.json({ metrics, clusters })
}))
