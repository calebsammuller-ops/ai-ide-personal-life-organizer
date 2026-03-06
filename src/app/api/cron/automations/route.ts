/**
 * Cron endpoint: runs every 30 minutes via Vercel Cron.
 * Evaluates all active time-based automation rules and executes due ones.
 *
 * Trigger types handled:
 *   daily_time   — trigger_config: { time: "HH:MM" }
 *   weekly_time  — trigger_config: { dayOfWeek: 0-6, time: "HH:MM" }
 *   monthly_date — trigger_config: { dayOfMonth: 1-31, time: "HH:MM" }
 *
 * Action types handled:
 *   create_task     — action_config: { title, duration?, priority?, deadline? }
 *   create_event    — action_config: { title, duration?, description? }
 *   capture_thought — action_config: { content }
 *   send_brief      — action_config: {}
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

// Use service-role key so we can read all users' automations
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

interface AutomationRule {
  id: string
  user_id: string
  name: string
  trigger_type: string
  trigger_config: Record<string, unknown>
  action_type: string
  action_config: Record<string, unknown>
  last_executed_at: string | null
  execution_count: number
}

function shouldRunNow(rule: AutomationRule, now: Date): boolean {
  const cfg = rule.trigger_config
  const lastRun = rule.last_executed_at ? new Date(rule.last_executed_at) : null

  // Parse scheduled time from config
  const schedTime = cfg.time as string | undefined
  if (!schedTime) return false
  const [schedHour, schedMin] = schedTime.split(':').map(Number)
  if (isNaN(schedHour) || isNaN(schedMin)) return false

  // Window: within the current 30-minute cron window of the scheduled time
  const windowStart = new Date(now)
  windowStart.setMinutes(windowStart.getMinutes() - 30, 0, 0)

  const todayScheduled = new Date(now)
  todayScheduled.setHours(schedHour, schedMin, 0, 0)

  if (todayScheduled < windowStart || todayScheduled > now) return false

  // Ensure we haven't already run in this window
  if (lastRun && lastRun >= windowStart) return false

  if (rule.trigger_type === 'daily_time') {
    return true
  }

  if (rule.trigger_type === 'weekly_time') {
    const targetDay = cfg.dayOfWeek as number
    return now.getDay() === targetDay
  }

  if (rule.trigger_type === 'monthly_date') {
    const targetDate = cfg.dayOfMonth as number
    return now.getDate() === targetDate
  }

  return false
}

async function executeAction(
  rule: AutomationRule,
  supabase: ReturnType<typeof getServiceClient>
): Promise<{ success: boolean; message: string }> {
  const { action_type, action_config, user_id } = rule

  if (action_type === 'create_task') {
    const { title, duration, priority, deadline } = action_config
    if (!title) return { success: false, message: 'Missing title in action_config' }

    const durationMinutes = typeof duration === 'number' ? duration : 30

    const { error } = await supabase.from('tasks').insert({
      user_id,
      title: title as string,
      description: `Created by automation: ${rule.name}`,
      duration_minutes: durationMinutes,
      priority: typeof priority === 'number' ? priority : 3,
      deadline: deadline as string | null || null,
      tags: ['auto'],
      status: 'pending',
      is_auto_scheduled: true,
      reschedule_count: 0,
    })

    if (error) return { success: false, message: error.message }
    return { success: true, message: `Task "${title}" created by automation` }
  }

  if (action_type === 'create_event') {
    const { title, duration, description } = action_config
    if (!title) return { success: false, message: 'Missing title in action_config' }

    const durationMins = typeof duration === 'number' ? duration : 60
    const now = new Date()
    const endTime = new Date(now.getTime() + durationMins * 60000)

    // Find user's primary calendar
    const { data: cal } = await supabase
      .from('calendars')
      .select('id')
      .eq('user_id', user_id)
      .eq('is_primary', true)
      .single()

    const { error } = await supabase.from('calendar_events').insert({
      user_id,
      calendar_id: cal?.id,
      title: title as string,
      description: (description as string) || `Created by automation: ${rule.name}`,
      start_time: now.toISOString(),
      end_time: endTime.toISOString(),
      all_day: false,
      status: 'confirmed',
      priority: 3,
      reminders: [],
      is_auto_scheduled: true,
      metadata: { source: 'automation', automation_id: rule.id },
    })

    if (error) return { success: false, message: error.message }
    return { success: true, message: `Event "${title}" created by automation` }
  }

  if (action_type === 'capture_thought') {
    const { content } = action_config
    if (!content) return { success: false, message: 'Missing content in action_config' }

    const { error } = await supabase.from('thoughts').insert({
      user_id,
      raw_content: content as string,
      category: 'note',
      priority: 3,
      tags: ['auto'],
      extracted_tasks: [],
      extracted_events: [],
      is_processed: false,
      is_archived: false,
    })

    if (error) return { success: false, message: error.message }
    return { success: true, message: `Thought captured by automation` }
  }

  return { success: false, message: `Unsupported action type: ${action_type}` }
}

export async function GET(request: NextRequest) {
  // Verify this is a legitimate Vercel cron call or internal call
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  const now = new Date()

  // Fetch all active time-based automations
  const { data: rules, error } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('is_active', true)
    .in('trigger_type', ['daily_time', 'weekly_time', 'monthly_date'])

  if (error) {
    console.error('[Cron/Automations] DB error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: { id: string; name: string; success: boolean; message: string }[] = []

  for (const rule of (rules || []) as AutomationRule[]) {
    if (!shouldRunNow(rule, now)) continue

    const result = await executeAction(rule, supabase)
    results.push({ id: rule.id, name: rule.name, ...result })

    // Update last_executed_at and execution_count
    await supabase
      .from('automation_rules')
      .update({
        last_executed_at: now.toISOString(),
        execution_count: rule.execution_count + 1,
        updated_at: now.toISOString(),
      })
      .eq('id', rule.id)

    console.log(`[Cron/Automations] ${rule.name}: ${result.success ? '✓' : '✗'} ${result.message}`)
  }

  const ran = results.length
  console.log(`[Cron/Automations] Checked ${(rules || []).length} rules, ran ${ran}`)

  // Knowledge graph evolution (runs once daily)
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    await fetch(`${baseUrl}/api/knowledge/evolve`, {
      method: 'POST',
      headers: { 'x-cron-secret': process.env.CRON_SECRET || '' },
    })
    console.log('[Cron/Automations] Knowledge evolution triggered')
  } catch { /* non-blocking */ }

  return NextResponse.json({
    ran,
    results,
    checkedAt: now.toISOString(),
  })
}
