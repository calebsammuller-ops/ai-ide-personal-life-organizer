/**
 * AI Decision Journal API
 *
 * GET — List AI decisions for the current user (with pagination)
 * POST — Log a new AI decision
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const offset = parseInt(searchParams.get('offset') || '0')
  const agent = searchParams.get('agent') // filter by agent type

  let query = supabase
    .from('ai_decisions')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (agent) {
    query = query.eq('agent', agent)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const decisions = (data || []).map(d => ({
    id: d.id,
    action: d.action,
    reason: d.reason,
    agent: d.agent,
    dataUsed: d.data_used,
    confidence: d.confidence,
    undoInstructions: d.undo_instructions,
    wasReversed: d.was_reversed,
    wasAccepted: d.was_accepted,
    createdAt: d.created_at,
  }))

  return NextResponse.json({ data: decisions, total: count })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { action, reason, agent, dataUsed, confidence, undoInstructions } = body

  if (!action || !reason) {
    return NextResponse.json({ error: 'action and reason are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('ai_decisions')
    .insert({
      user_id: user.id,
      action,
      reason,
      agent: agent || 'executor',
      data_used: dataUsed || [],
      confidence: confidence || 0.8,
      undo_instructions: undoInstructions,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data: {
      id: data.id,
      action: data.action,
      reason: data.reason,
      agent: data.agent,
      createdAt: data.created_at,
    },
  })
}
