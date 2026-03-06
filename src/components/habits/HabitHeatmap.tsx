'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Flame, TrendingUp, CheckCircle2, Calendar } from 'lucide-react'
import type { HabitCompletion } from '@/types'

interface HabitHeatmapProps {
  completions: Record<string, HabitCompletion[]>
  habitCount: number
}

const WEEKS = 16
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function intensityClass(count: number, max: number): string {
  if (count === 0) return 'bg-zinc-800/70 hover:bg-zinc-700/70'
  const ratio = count / Math.max(max, 1)
  if (ratio <= 0.25) return 'bg-purple-900 hover:bg-purple-800'
  if (ratio <= 0.5)  return 'bg-purple-700 hover:bg-purple-600'
  if (ratio <= 0.75) return 'bg-purple-500 hover:bg-purple-400'
  return 'bg-purple-400 hover:bg-purple-300 shadow-[0_0_6px_rgba(168,85,247,0.5)]'
}

export function HabitHeatmap({ completions, habitCount }: HabitHeatmapProps) {
  const { weeks, stats } = useMemo(() => {
    // Build date → count map from all completions
    const dateMap: Record<string, number> = {}
    Object.values(completions).forEach((habCompletions) => {
      habCompletions.forEach((c) => {
        dateMap[c.completedDate] = (dateMap[c.completedDate] ?? 0) + 1
      })
    })

    // Build list of last WEEKS*7 days starting from the Monday of the oldest week
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Snap to the Sunday at/before today so columns align
    // weekday: 0=Sun,1=Mon..6=Sat → shift to 0=Mon..6=Sun
    const dow = (today.getDay() + 6) % 7 // 0=Mon, 6=Sun
    const totalDays = WEEKS * 7
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - (totalDays - 1) - dow)

    const days: { date: string; count: number; dow: number; isToday: boolean; isFuture: boolean }[] = []
    for (let i = 0; i < totalDays + dow; i++) {
      const d = new Date(startDate)
      d.setDate(startDate.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      const isFuture = d > today
      days.push({
        date: dateStr,
        count: isFuture ? 0 : (dateMap[dateStr] ?? 0),
        dow: (d.getDay() + 6) % 7,
        isToday: dateStr === today.toISOString().split('T')[0],
        isFuture,
      })
    }

    // Chunk into weeks (columns)
    const weekCols: typeof days[] = []
    for (let w = 0; w < Math.ceil(days.length / 7); w++) {
      weekCols.push(days.slice(w * 7, w * 7 + 7))
    }

    // Stats
    const last30 = days.slice(-30)
    const totalLast30 = last30.reduce((s, d) => s + d.count, 0)
    const last7 = days.slice(-7)
    const totalLast7 = last7.reduce((s, d) => s + d.count, 0)

    // Best day of week
    const dowTotals = [0, 0, 0, 0, 0, 0, 0]
    days.forEach((d) => { if (!d.isFuture) dowTotals[d.dow] += d.count })
    const bestDow = dowTotals.indexOf(Math.max(...dowTotals))

    // Current streak (consecutive days with ≥1 completion, going backwards from today)
    let streak = 0
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].isFuture) continue
      if (days[i].count > 0) streak++
      else break
    }

    const max = Math.max(...days.map((d) => d.count), 1)

    return {
      weeks: weekCols,
      stats: { totalLast30, totalLast7, bestDow, streak, max },
    }
  }, [completions, habitCount])

  const { max, streak, totalLast7, totalLast30, bestDow } = stats

  return (
    <div className="space-y-4">
      {/* Mini stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Flame, label: 'Current streak', value: `${streak}d`, color: 'text-orange-400' },
          { icon: CheckCircle2, label: 'This week', value: totalLast7, color: 'text-green-400' },
          { icon: TrendingUp, label: 'Last 30 days', value: totalLast30, color: 'text-purple-400' },
          { icon: Calendar, label: 'Best day', value: DAY_LABELS[bestDow] ?? '—', color: 'text-blue-400' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="flex items-center gap-2 bg-zinc-900/50 rounded-lg px-3 py-2 border border-white/5">
            <Icon className={cn('h-4 w-4 shrink-0', color)} />
            <div>
              <p className="text-[10px] text-zinc-500 leading-none">{label}</p>
              <p className="text-sm font-bold text-zinc-100 mt-0.5">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-1 min-w-max">
          {/* Day-of-week labels */}
          <div className="flex flex-col gap-[3px] pt-5 pr-1">
            {DAY_LABELS.map((label, i) => (
              <div key={i} className="h-3 flex items-center">
                <span className="text-[9px] text-zinc-600 w-5 text-right leading-none">
                  {i % 2 === 0 ? label.slice(0, 1) : ''}
                </span>
              </div>
            ))}
          </div>

          {/* Week columns */}
          {weeks.map((week, wIdx) => {
            // Month label for first week of each month
            const firstDay = week[0]
            const showMonth = firstDay && new Date(firstDay.date).getDate() <= 7
            const monthLabel = firstDay
              ? new Date(firstDay.date).toLocaleDateString('en-US', { month: 'short' })
              : ''

            return (
              <div key={wIdx} className="flex flex-col gap-[3px]">
                {/* Month label */}
                <div className="h-4 flex items-end">
                  <span className="text-[9px] text-zinc-600 leading-none">
                    {showMonth ? monthLabel : ''}
                  </span>
                </div>
                {/* Day cells */}
                {week.map((day, dIdx) => (
                  <div
                    key={day.date}
                    className={cn(
                      'h-3 w-3 rounded-[2px] transition-all duration-100 cursor-default',
                      day.isFuture
                        ? 'bg-zinc-900/40'
                        : intensityClass(day.count, max),
                      day.isToday && 'ring-1 ring-purple-400 ring-offset-[1px] ring-offset-background'
                    )}
                    title={day.isFuture ? 'Future' : `${day.date}: ${day.count} completion${day.count !== 1 ? 's' : ''}`}
                  />
                ))}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-2 justify-end">
          <span className="text-[9px] text-zinc-600">Less</span>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <div
              key={i}
              className={cn('h-3 w-3 rounded-[2px]', intensityClass(ratio * max, max))}
            />
          ))}
          <span className="text-[9px] text-zinc-600">More</span>
        </div>
      </div>
    </div>
  )
}
