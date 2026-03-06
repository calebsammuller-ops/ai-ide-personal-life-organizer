import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate') || new Date(Date.now() - 7 * 86400000).toISOString()
  const endDate = searchParams.get('endDate') || new Date().toISOString()

  const { data, error } = await supabase
    .from('time_entries')
    .select('*, tasks(title, project_id)')
    .eq('user_id', user.id)
    .gte('start_time', startDate)
    .lte('start_time', endDate)
    .order('start_time', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Group by date
  const dailyTotals: Record<string, number> = {}
  const taskTotals: Record<string, { taskId: string; title: string; totalSeconds: number }> = {}
  let totalSeconds = 0

  for (const entry of data || []) {
    const seconds = entry.duration_seconds || 0
    totalSeconds += seconds

    const dateKey = new Date(entry.start_time).toISOString().split('T')[0]
    dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + seconds

    const taskTitle = entry.tasks?.title || 'Unknown'
    if (!taskTotals[entry.task_id]) {
      taskTotals[entry.task_id] = { taskId: entry.task_id, title: taskTitle, totalSeconds: 0 }
    }
    taskTotals[entry.task_id].totalSeconds += seconds
  }

  return NextResponse.json({
    data: {
      totalSeconds,
      dailyTotals,
      taskBreakdown: Object.values(taskTotals).sort((a, b) => b.totalSeconds - a.totalSeconds),
      entryCount: (data || []).length,
    },
  })
}
