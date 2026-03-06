/**
 * Activity Signals API
 *
 * GET — Get recent activity signals and summary
 * POST — Record a new signal
 * DELETE — Clean expired signals
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { recordSignal, getRecentSignals, getSignalSummary, detectBurnoutSignals, cleanExpiredSignals } from '@/lib/activitySignals'
import type { SignalType } from '@/lib/activitySignals'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '14')
  const includeBurnout = searchParams.get('burnout') === 'true'

  const [signals, summary] = await Promise.all([
    getRecentSignals(user.id, supabase, days),
    getSignalSummary(user.id, supabase, days),
  ])

  const response: Record<string, unknown> = { signals, summary }

  if (includeBurnout) {
    response.burnout = await detectBurnoutSignals(user.id, supabase)
  }

  return NextResponse.json({ data: response })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { signalType, signalData } = body

  if (!signalType) {
    return NextResponse.json({ error: 'signalType is required' }, { status: 400 })
  }

  await recordSignal(user.id, signalType as SignalType, signalData || {}, supabase)

  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cleaned = await cleanExpiredSignals(supabase)

  return NextResponse.json({ cleaned })
}
