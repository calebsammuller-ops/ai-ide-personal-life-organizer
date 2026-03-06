'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { ChevronLeft, ChevronRight, Plus, Lock, Unlock } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  selectAllEvents,
  selectSelectedDate,
  setSelectedDate,
  fetchEvents,
} from '@/state/slices/calendarSlice'
import { selectAllHabits, fetchHabits } from '@/state/slices/habitsSlice'
import { selectAllTasks, fetchTasks } from '@/state/slices/tasksSlice'
import { openModal } from '@/state/slices/uiSlice'
import { cn } from '@/lib/utils'
import { useRegisterPageContext } from '@/hooks/useRegisterPageContext'
import type { CalendarEvent, Habit } from '@/types'

const HOUR_PX = 56
const START_HOUR = 6
const END_HOUR = 23
const TOTAL_HOURS = END_HOUR - START_HOUR

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTH_NAMES = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER']

function dateStr(d: Date) { return d.toISOString().split('T')[0] }
function todayStr() { return dateStr(new Date()) }

function getWeekDays(anchor: Date): Date[] {
  const dayOfWeek = anchor.getDay()
  const weekStart = new Date(anchor)
  weekStart.setDate(anchor.getDate() - dayOfWeek)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
}

function getDaysInMonth(month: Date): (Date | null)[] {
  const year = month.getFullYear()
  const m = month.getMonth()
  const firstDay = new Date(year, m, 1).getDay()
  const lastDate = new Date(year, m + 1, 0).getDate()
  const days: (Date | null)[] = Array.from({ length: firstDay }, () => null)
  for (let i = 1; i <= lastDate; i++) days.push(new Date(year, m, i))
  return days
}

function eventTopPct(startTime: string): number {
  const d = new Date(startTime)
  const h = d.getHours() + d.getMinutes() / 60
  return Math.max(0, (h - START_HOUR) / TOTAL_HOURS * 100)
}

function eventHeightPct(startTime: string, endTime: string): number {
  const start = new Date(startTime)
  const end = new Date(endTime)
  const durationHours = Math.max(0.25, (end.getTime() - start.getTime()) / 3600000)
  return durationHours / TOTAL_HOURS * 100
}

function getBlockState(startTime: string, endTime: string): 'active' | 'past' | 'future' {
  const nowMs = Date.now()
  const s = new Date(startTime).getTime()
  const e = new Date(endTime).getTime()
  if (nowMs >= s && nowMs <= e) return 'active'
  if (e < nowMs) return 'past'
  return 'future'
}

export default function CalendarPage() {
  const dispatch = useAppDispatch()
  const events = useAppSelector(selectAllEvents)
  const habits = useAppSelector(selectAllHabits)
  const tasks = useAppSelector(selectAllTasks)
  const selectedDate = useAppSelector(selectSelectedDate)
  const [view, setView] = useState<'week' | 'month'>('week')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isLockIn, setIsLockIn] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useRegisterPageContext({
    pageTitle: 'Calendar',
    activeView: view,
    visibleContent: { type: 'calendar', selectedDate, eventCount: events.length },
  })

  useEffect(() => {
    dispatch(fetchHabits())
    dispatch(fetchTasks())
  }, [dispatch])

  useEffect(() => {
    const anchor = view === 'week' ? new Date(selectedDate) : currentMonth
    const start = view === 'week'
      ? dateStr(getWeekDays(anchor)[0])
      : dateStr(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1))
    const end = view === 'week'
      ? dateStr(getWeekDays(anchor)[6])
      : dateStr(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0))
    dispatch(fetchEvents({ start, end }))
  }, [dispatch, selectedDate, currentMonth, view])

  useEffect(() => {
    if (scrollRef.current && view === 'week') {
      const currentHour = new Date().getHours()
      const scrollTo = Math.max(0, (currentHour - START_HOUR - 1)) * HOUR_PX
      scrollRef.current.scrollTop = scrollTo
    }
  }, [view])

  const weekDays = useMemo(() => getWeekDays(new Date(selectedDate)), [selectedDate])
  const monthDays = useMemo(() => getDaysInMonth(currentMonth), [currentMonth])
  const today = todayStr()

  // Lock-In Mode: show only today
  const displayDays = isLockIn ? [new Date(today)] : weekDays

  const findHabitForEvent = (event: CalendarEvent): Habit | null => {
    for (const h of habits) {
      if (event.title === `${h.icon} ${h.name}`) return h
    }
    return null
  }

  const getEventsForDay = (d: Date) => {
    const ds = dateStr(d)
    return events.filter(e => new Date(e.startTime).toISOString().split('T')[0] === ds)
  }

  const getTaskDeadlinesForDay = (d: Date) => {
    const ds = dateStr(d)
    return tasks.filter(t =>
      t.status !== 'completed' && t.deadline &&
      new Date(t.deadline).toISOString().split('T')[0] === ds
    )
  }

  const getScheduledTasksForDay = (d: Date) => {
    const ds = dateStr(d)
    return tasks.filter(t =>
      t.scheduledStart && t.scheduledEnd &&
      t.status !== 'completed' &&
      new Date(t.scheduledStart as string).toISOString().split('T')[0] === ds
    )
  }

  const getHabitsForDay = (d: Date) => {
    const dow = d.getDay()
    const dayName = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][dow]
    return habits.filter(h => {
      if (!h.isActive) return false
      if (h.frequency === 'daily') return true
      if (h.frequency === 'weekly') {
        const cfg = h.frequencyConfig as { days?: string[] } | undefined
        return cfg?.days?.includes(dayName) ?? dow === 1
      }
      if (h.frequency === 'monthly') {
        const startDay = h.startDate ? new Date(h.startDate).getDate() : 1
        return d.getDate() === startDay
      }
      return false
    })
  }

  const navigateWeek = (dir: -1 | 1) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + dir * 7)
    dispatch(setSelectedDate(dateStr(d)))
  }

  const navigateMonth = (dir: -1 | 1) => {
    setCurrentMonth(prev => {
      const m = new Date(prev)
      m.setMonth(m.getMonth() + dir)
      return m
    })
  }

  const goToToday = () => {
    dispatch(setSelectedDate(today))
    setCurrentMonth(new Date())
  }

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i)
  const nowHour = new Date().getHours()

  const weekLabel = isLockIn
    ? new Date(today).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()
    : `${weekDays[0].toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`.toUpperCase()
  const monthLabel = `${MONTH_NAMES[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`

  return (
    <div className={cn(
      'flex flex-col h-[calc(100vh-3rem)] overflow-hidden transition-colors duration-500',
      isLockIn && 'bg-black/60'
    )}>
      {/* ── Header ── */}
      <div className={cn(
        'flex items-center justify-between px-4 py-2 border-b border-border/50 shrink-0 transition-all duration-300',
        isLockIn && 'border-primary/20 bg-black/40'
      )}>
        {isLockIn ? (
          /* Lock-In Mode header */
          <div className="flex items-center gap-3 flex-1">
            <Lock className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-primary">
              LOCK-IN
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/60 tracking-widest">
              — {weekLabel}
            </span>
            <div className="flex-1" />
            <button
              onClick={() => setIsLockIn(false)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
            >
              <Unlock className="h-3 w-3" />
              UNLOCK
            </button>
          </div>
        ) : (
          /* Normal header */
          <>
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-5 bg-primary" />
              <h1 className="text-xs font-mono font-bold uppercase tracking-widest">// TIME GRID</h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => view === 'week' ? navigateWeek(-1) : navigateMonth(-1)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[10px] font-mono text-foreground min-w-[160px] text-center tracking-wider">
                {view === 'week' ? weekLabel : monthLabel}
              </span>
              <button
                onClick={() => view === 'week' ? navigateWeek(1) : navigateMonth(1)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={goToToday}
                className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider border border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
              >
                NOW
              </button>

              {/* View toggle */}
              <div className="flex border border-border/50">
                {(['week', 'month'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={cn(
                      'px-3 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors',
                      view === v
                        ? 'bg-primary text-white'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {v === 'week' ? 'GRID' : 'MAP'}
                  </button>
                ))}
              </div>

              {/* Lock-In toggle */}
              <button
                onClick={() => setIsLockIn(true)}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono uppercase tracking-wider border border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
              >
                <Lock className="h-3 w-3" />
                LOCK-IN
              </button>

              {/* Schedule button */}
              <button
                onClick={() => dispatch(openModal({ modalName: 'createEvent' }))}
                className="flex items-center gap-1 px-2 py-1 bg-primary text-white text-[10px] font-mono uppercase tracking-wider hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-3 w-3" />
                SCHEDULE
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── GRID VIEW (week/lock-in) ── */}
      {view === 'week' && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Day column headers */}
          <div className="flex shrink-0 border-b border-border/30">
            <div className="w-14 shrink-0" />
            {displayDays.map(d => {
              const ds = dateStr(d)
              const isToday = ds === today
              const deadlines = getTaskDeadlinesForDay(d)
              return (
                <button
                  key={ds}
                  onClick={() => dispatch(setSelectedDate(ds))}
                  className={cn(
                    'flex-1 py-2 text-center border-l border-border/20 transition-colors hover:bg-primary/5',
                    isToday && 'bg-primary/8'
                  )}
                >
                  <span className={cn(
                    'block text-[9px] font-mono font-bold uppercase tracking-widest',
                    isToday ? 'text-primary' : 'text-muted-foreground/50'
                  )}>
                    {DAY_NAMES[d.getDay()]}
                  </span>
                  <span className={cn(
                    'block text-sm font-bold font-mono mt-0.5',
                    isToday ? 'text-primary' : ds === selectedDate ? 'text-foreground' : 'text-muted-foreground/60'
                  )}>
                    {d.getDate()}
                  </span>
                  {deadlines.length > 0 && (
                    <div className="flex justify-center mt-0.5 gap-0.5">
                      <span className="text-[8px] font-mono bg-red-950/80 text-red-300 border border-red-700/60 px-1">
                        {deadlines.length} ◆
                      </span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Protocols row (habits / all-day) */}
          <div className="flex shrink-0 border-b border-border/30 min-h-[28px]">
            <div className="w-14 shrink-0 flex items-center justify-end pr-2">
              <span className="text-[7px] font-mono text-muted-foreground/30 uppercase tracking-widest">PROTOCOLS</span>
            </div>
            {displayDays.map(d => {
              const ds = dateStr(d)
              const dayHabits = getHabitsForDay(d)
              const isToday = ds === today
              return (
                <div key={ds} className={cn(
                  'flex-1 border-l border-border/20 px-0.5 py-0.5 flex flex-wrap gap-0.5',
                  isToday && 'bg-primary/5'
                )}>
                  {dayHabits.slice(0, isLockIn ? 6 : 2).map(h => (
                    <button
                      key={h.id}
                      onClick={() => dispatch(openModal({ modalName: 'habitPlan', data: { habit: h } }))}
                      className="text-[8px] font-mono bg-primary/15 border border-primary/30 text-primary px-1 py-0.5 truncate max-w-full hover:bg-primary/25 transition-colors uppercase tracking-wide"
                    >
                      {h.icon} {h.name}
                    </button>
                  ))}
                  {dayHabits.length > (isLockIn ? 6 : 2) && (
                    <span className="text-[8px] font-mono text-primary/50">+{dayHabits.length - (isLockIn ? 6 : 2)}</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Time grid */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="flex" style={{ height: `${TOTAL_HOURS * HOUR_PX}px` }}>
              {/* Hour labels */}
              <div className="w-14 shrink-0 relative">
                {hours.map(h => (
                  <div
                    key={h}
                    className={cn(
                      'absolute right-2 text-[9px] font-mono uppercase tracking-wide',
                      h < nowHour ? 'text-muted-foreground/20' : 'text-muted-foreground/40'
                    )}
                    style={{ top: `${(h - START_HOUR) * HOUR_PX - 7}px` }}
                  >
                    {h === 12 ? '12P' : h > 12 ? `${h-12}P` : `${h}A`}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {displayDays.map(d => {
                const ds = dateStr(d)
                const isToday = ds === today
                const dayEvents = getEventsForDay(d)
                const dayDeadlines = getTaskDeadlinesForDay(d)
                const scheduledTasks = getScheduledTasksForDay(d)
                const now = new Date()

                return (
                  <div
                    key={ds}
                    className={cn(
                      'flex-1 border-l border-border/20 relative',
                      isToday && 'bg-primary/[0.025]',
                      isLockIn && 'bg-black/20'
                    )}
                  >
                    {/* Hour grid lines */}
                    {hours.map(h => (
                      <div key={h}>
                        <div
                          className="absolute left-0 right-0 border-t border-border/10"
                          style={{ top: `${(h - START_HOUR) * HOUR_PX}px` }}
                        />
                        {/* Half-hour dashed line */}
                        <div
                          className="absolute left-0 right-0 border-t border-border/[0.06] border-dashed"
                          style={{ top: `${(h - START_HOUR) * HOUR_PX + HOUR_PX / 2}px` }}
                        />
                      </div>
                    ))}

                    {/* Past hour dimming (today only) */}
                    {isToday && hours.map(h => {
                      const isPastHour = h < nowHour
                      if (!isPastHour) return null
                      return (
                        <div
                          key={`past-${h}`}
                          className="absolute left-0 right-0 bg-black/20 pointer-events-none"
                          style={{ top: `${(h - START_HOUR) * HOUR_PX}px`, height: `${HOUR_PX}px` }}
                        />
                      )
                    })}

                    {/* Current time indicator with trail */}
                    {isToday && (() => {
                      const h = now.getHours() + now.getMinutes() / 60
                      if (h >= START_HOUR && h <= END_HOUR) {
                        const topPx = (h - START_HOUR) * HOUR_PX
                        return (
                          <>
                            {/* Gradient trail above */}
                            <div
                              className="absolute left-0 right-0 pointer-events-none z-10"
                              style={{
                                top: `${Math.max(0, topPx - 32)}px`,
                                height: '32px',
                                background: 'linear-gradient(to bottom, transparent, hsl(var(--primary) / 0.12))',
                              }}
                            />
                            {/* Time line */}
                            <div
                              className="absolute left-0 right-0 z-10 pointer-events-none"
                              style={{ top: `${topPx}px` }}
                            >
                              <div className="h-px bg-primary/70 w-full" />
                              <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.8)]" />
                            </div>
                          </>
                        )
                      }
                      return null
                    })()}

                    {/* Deadline markers */}
                    {dayDeadlines.map((t, i) => (
                      <div
                        key={t.id}
                        title={`◆ TARGET: ${t.title}`}
                        style={{ top: `${2 + i * 20}px`, left: '2px', right: '2px', minHeight: '18px' }}
                        className="absolute z-10 flex items-center gap-1 px-1 py-0.5 bg-red-950/80 border border-red-700/60 text-red-300 text-[8px] font-mono cursor-pointer hover:bg-red-900/80 transition-colors overflow-hidden uppercase tracking-wide"
                      >
                        <span className="text-red-400 flex-shrink-0">◆</span>
                        <span className="truncate">{t.title}</span>
                      </div>
                    ))}

                    {/* Calendar BLOCKS */}
                    {dayEvents.map(ev => {
                      const isHabit = !!findHabitForEvent(ev)
                      const evStart = String(ev.startTime)
                      const evEnd = String(ev.endTime)
                      const blockState = getBlockState(evStart, evEnd)
                      const top = eventTopPct(evStart)
                      const height = eventHeightPct(evStart, evEnd)
                      const startLabel = new Date(ev.startTime).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })
                      const typeLabel = isHabit ? 'PROTOCOL' : 'BLOCK'

                      return (
                        <button
                          key={ev.id}
                          onClick={() => {
                            const h = findHabitForEvent(ev)
                            if (h) dispatch(openModal({ modalName: 'habitPlan', data: { habit: h } }))
                          }}
                          title={ev.title}
                          className={cn(
                            'absolute left-0.5 right-0.5 z-20 px-1 py-0.5 overflow-hidden text-left border-l-2 rounded-none transition-opacity',
                            // Base color
                            isHabit
                              ? 'bg-primary/15 border-primary text-primary'
                              : 'bg-zinc-900 border-primary/50 text-zinc-200',
                            // State
                            blockState === 'active' && 'tactical-active ring-1 ring-primary/40',
                            blockState === 'past' && 'opacity-35',
                          )}
                          style={{
                            top: `${top}%`,
                            height: `${Math.max(height, 100 / (TOTAL_HOURS * 4))}%`,
                            minHeight: '18px',
                          }}
                        >
                          <span className="block text-[7px] font-mono font-bold truncate leading-tight text-muted-foreground/50 uppercase tracking-wider">
                            {typeLabel} · {startLabel}
                          </span>
                          <span className={cn(
                            'block text-[9px] font-mono truncate leading-tight uppercase tracking-wide',
                            blockState === 'past' && 'line-through opacity-70'
                          )}>
                            {ev.title}
                          </span>
                        </button>
                      )
                    })}

                    {/* Scheduled OPERATIONS */}
                    {scheduledTasks.map(t => {
                      const start = t.scheduledStart as string
                      const end = t.scheduledEnd as string
                      const blockState = getBlockState(start, end)
                      const top = eventTopPct(start)
                      const height = eventHeightPct(start, end)
                      const startLabel = new Date(start).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })
                      const priorityBorder = ['', 'border-red-500', 'border-orange-400', 'border-blue-400', 'border-blue-300', 'border-zinc-500']
                      const borderColor = priorityBorder[t.priority] ?? 'border-blue-400'

                      return (
                        <div
                          key={t.id}
                          title={t.title}
                          className={cn(
                            'absolute left-0.5 right-0.5 z-[15] px-1 py-0.5 overflow-hidden border-l-2 rounded-none',
                            'bg-zinc-900/80 text-zinc-300 cursor-default',
                            borderColor,
                            blockState === 'active' && 'tactical-active ring-1 ring-blue-400/30',
                            blockState === 'past' && 'opacity-35',
                          )}
                          style={{
                            top: `${top}%`,
                            height: `${Math.max(height, 100 / (TOTAL_HOURS * 4))}%`,
                            minHeight: '18px',
                          }}
                        >
                          <span className="block text-[7px] font-mono font-bold truncate leading-tight text-zinc-500 uppercase tracking-wider">
                            OPERATION · {startLabel}
                          </span>
                          <span className={cn(
                            'block text-[9px] font-mono truncate leading-tight uppercase tracking-wide',
                            blockState === 'past' && 'line-through opacity-70'
                          )}>
                            {t.title}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── MAP VIEW (month) ── */}
      {view === 'month' && (
        <div className="flex-1 overflow-auto p-3">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground/30 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-px bg-border/10">
            {monthDays.map((d, i) => {
              if (!d) return <div key={`empty-${i}`} className="bg-background min-h-[80px]" />
              const ds = dateStr(d)
              const isToday = ds === today
              const isSelected = ds === selectedDate
              const dayEvents = getEventsForDay(d)
              const dayHabits = getHabitsForDay(d)
              const dayDeadlines = getTaskDeadlinesForDay(d)

              return (
                <button
                  key={ds}
                  onClick={() => dispatch(setSelectedDate(ds))}
                  className={cn(
                    'bg-background min-h-[80px] p-1.5 text-left transition-colors hover:bg-primary/5 relative',
                    isSelected && 'ring-1 ring-inset ring-primary/30',
                  )}
                >
                  <span className={cn(
                    'text-[10px] font-mono font-bold w-6 h-6 flex items-center justify-center mb-1',
                    isToday ? 'bg-primary text-white' : 'text-muted-foreground/50'
                  )}>
                    {d.getDate()}
                  </span>

                  {dayDeadlines.slice(0, 1).map(t => (
                    <div key={t.id} className="text-[7px] font-mono bg-red-950/70 border border-red-700/50 text-red-300 px-1 mb-0.5 truncate uppercase tracking-wide">
                      ◆ {t.title}
                    </div>
                  ))}

                  {dayEvents.slice(0, 2).map(ev => {
                    const isHabit = !!findHabitForEvent(ev)
                    const blockState = getBlockState(String(ev.startTime), String(ev.endTime))
                    return (
                      <div key={ev.id} className={cn(
                        'text-[7px] font-mono px-1 mb-0.5 truncate border-l uppercase tracking-wide',
                        isHabit
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-zinc-900 border-primary/40 text-zinc-300',
                        blockState === 'past' && 'opacity-40',
                      )}>
                        {ev.title}
                      </div>
                    )
                  })}

                  {(dayEvents.length + dayDeadlines.length) > 2 && (
                    <span className="text-[7px] font-mono text-muted-foreground/30 uppercase">
                      +{dayEvents.length + dayDeadlines.length - 2}
                    </span>
                  )}

                  {dayHabits.length > 0 && (
                    <div className="absolute bottom-1 right-1 flex gap-0.5">
                      <div className="w-1.5 h-1.5 bg-primary/50" title={`${dayHabits.length} protocols`} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Selected day detail */}
          {selectedDate && (() => {
            const d = new Date(selectedDate)
            const dayEvents = getEventsForDay(d)
            const dayHabits = getHabitsForDay(d)
            const dayDeadlines = getTaskDeadlinesForDay(d)
            const dayScheduled = getScheduledTasksForDay(d)
            if (dayEvents.length + dayHabits.length + dayDeadlines.length + dayScheduled.length === 0) return null
            return (
              <div className="mt-3 border border-border/30 bg-card/40 p-3">
                <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
                  {d.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
                </p>
                <div className="space-y-1">
                  {dayDeadlines.map(t => (
                    <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 bg-red-950/50 border border-red-700/40">
                      <span className="text-[9px] font-mono text-red-400 uppercase tracking-wider">◆ TARGET</span>
                      <span className="text-xs font-mono text-red-200 uppercase">{t.title}</span>
                    </div>
                  ))}
                  {dayHabits.map(h => (
                    <button
                      key={h.id}
                      onClick={() => dispatch(openModal({ modalName: 'habitPlan', data: { habit: h } }))}
                      className="w-full flex items-center gap-2 px-2 py-1.5 bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors text-left"
                    >
                      <span className="text-sm">{h.icon}</span>
                      <span className="text-[10px] font-mono text-primary uppercase tracking-wider">{h.name}</span>
                      <span className="text-[8px] font-mono text-muted-foreground/40 ml-auto uppercase">PROTOCOL</span>
                    </button>
                  ))}
                  {dayScheduled.map(t => (
                    <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 bg-zinc-900 border border-zinc-700/40">
                      <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider">
                        {new Date(t.scheduledStart as string).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      <span className="text-xs font-mono text-zinc-200 uppercase">{t.title}</span>
                      <span className="text-[8px] font-mono text-zinc-600 ml-auto uppercase">OPERATION</span>
                    </div>
                  ))}
                  {dayEvents.map(ev => {
                    const isHabit = !!findHabitForEvent(ev)
                    return (
                      <div key={ev.id} className="flex items-center gap-2 px-2 py-1.5 bg-zinc-900/60 border border-zinc-700/30">
                        <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider">
                          {new Date(ev.startTime).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                        <span className="text-xs font-mono text-zinc-200 uppercase">{ev.title}</span>
                        <span className="text-[8px] font-mono text-zinc-600 ml-auto uppercase">{isHabit ? 'PROTOCOL' : 'BLOCK'}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
