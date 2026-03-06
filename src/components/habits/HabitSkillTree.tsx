'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Check, Trash2, X, Swords, Calendar, Clock, Zap, GripVertical, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Habit } from '@/types'
import { getHabitIcon } from './HabitIcon'

interface HabitSkillTreeProps {
  habits: Habit[]
  completedIds: string[]
  onToggleHabit: (habitId: string) => void
  onDeleteHabit: (habitId: string) => void
  onViewPlan: (habit: Habit) => void
}

interface NodePosition {
  x: number
  y: number
  angle: number
  ring: number
}

// Category colors with lightning theme
const categoryColors: Record<string, { gradient: string; lightning: string; glow: string }> = {
  Health: {
    gradient: 'from-emerald-500 to-cyan-500',
    lightning: '#10b981',
    glow: 'shadow-[0_0_30px_rgba(16,185,129,0.7)]',
  },
  Fitness: {
    gradient: 'from-red-500 to-orange-500',
    lightning: '#ef4444',
    glow: 'shadow-[0_0_30px_rgba(239,68,68,0.7)]',
  },
  Learning: {
    gradient: 'from-blue-500 to-cyan-400',
    lightning: '#3b82f6',
    glow: 'shadow-[0_0_30px_rgba(59,130,246,0.7)]',
  },
  Mindfulness: {
    gradient: 'from-violet-500 to-purple-500',
    lightning: '#8b5cf6',
    glow: 'shadow-[0_0_30px_rgba(139,92,246,0.7)]',
  },
  Productivity: {
    gradient: 'from-amber-500 to-yellow-400',
    lightning: '#f59e0b',
    glow: 'shadow-[0_0_30px_rgba(245,158,11,0.7)]',
  },
  Social: {
    gradient: 'from-pink-500 to-rose-400',
    lightning: '#ec4899',
    glow: 'shadow-[0_0_30px_rgba(236,72,153,0.7)]',
  },
  Creative: {
    gradient: 'from-orange-500 to-amber-400',
    lightning: '#f97316',
    glow: 'shadow-[0_0_30px_rgba(249,115,22,0.7)]',
  },
  default: {
    gradient: 'from-blue-500 to-cyan-400',
    lightning: '#60a5fa',
    glow: 'shadow-[0_0_30px_rgba(96,165,250,0.7)]',
  },
}

// Generate lightning path between two points
function generateLightningPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  segments: number = 5
): string {
  const points: { x: number; y: number }[] = [{ x: x1, y: y1 }]

  const dx = (x2 - x1) / segments
  const dy = (y2 - y1) / segments
  const perpX = -dy * 0.3
  const perpY = dx * 0.3

  for (let i = 1; i < segments; i++) {
    const baseX = x1 + dx * i
    const baseY = y1 + dy * i
    const offset = (Math.random() - 0.5) * 2
    points.push({
      x: baseX + perpX * offset,
      y: baseY + perpY * offset,
    })
  }

  points.push({ x: x2, y: y2 })

  return points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')
}

export function HabitSkillTree({
  habits,
  completedIds,
  onToggleHabit,
  onDeleteHabit,
  onViewPlan,
}: HabitSkillTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredHabit, setHoveredHabit] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [lightningPaths, setLightningPaths] = useState<Record<string, string>>({})

  // Dragging state
  const [draggedHabit, setDraggedHabit] = useState<string | null>(null)
  const [customPositions, setCustomPositions] = useState<Record<string, { x: number; y: number }>>({})
  const dragStartPos = useRef<{ x: number; y: number; nodeX: number; nodeY: number } | null>(null)

  // Calculate default node positions
  const defaultPositions = useMemo(() => {
    const positions: Record<string, NodePosition> = {}
    const centerX = 50
    const centerY = 50

    const categorized: Record<string, Habit[]> = {}
    habits.forEach((habit) => {
      const cat = habit.category || 'default'
      if (!categorized[cat]) categorized[cat] = []
      categorized[cat].push(habit)
    })

    const categories = Object.keys(categorized)
    if (habits.length === 0) return positions

    let habitIndex = 0
    const ringSpacing = 22

    categories.forEach((category, catIndex) => {
      const categoryHabits = categorized[category]
      const baseAngle = (catIndex / categories.length) * 360

      categoryHabits.forEach((habit, idx) => {
        const ring = Math.floor(habitIndex / 8) + 1
        const angleSpread = 360 / Math.max(categories.length, 1)
        const localAngle = baseAngle + (idx / categoryHabits.length) * angleSpread * 0.8

        const radius = ring * ringSpacing
        const angleRad = (localAngle * Math.PI) / 180

        positions[habit.id] = {
          x: centerX + radius * Math.cos(angleRad),
          y: centerY + radius * Math.sin(angleRad),
          angle: localAngle,
          ring,
        }
        habitIndex++
      })
    })

    return positions
  }, [habits])

  // Get actual position (custom or default)
  const getNodePosition = useCallback((habitId: string) => {
    if (customPositions[habitId]) {
      return { ...defaultPositions[habitId], ...customPositions[habitId] }
    }
    return defaultPositions[habitId]
  }, [customPositions, defaultPositions])

  // Regenerate lightning paths periodically
  useEffect(() => {
    const updateLightning = () => {
      const newPaths: Record<string, string> = {}
      habits.forEach((habit) => {
        const pos = getNodePosition(habit.id)
        if (!pos) return

        const centerX = 50
        const centerY = 50

        const pathId = `lightning-${habit.id}`
        newPaths[pathId] = generateLightningPath(
          centerX,
          centerY,
          pos.x,
          pos.y,
          Math.max(3, Math.floor(pos.ring * 2))
        )
      })
      setLightningPaths(newPaths)
    }

    updateLightning()
    const interval = setInterval(updateLightning, 150)

    return () => clearInterval(interval)
  }, [habits, getNodePosition])

  // Drag handlers
  const handleDragStart = useCallback((habitId: string, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const pos = getNodePosition(habitId)
    if (!pos || !containerRef.current) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    dragStartPos.current = {
      x: clientX,
      y: clientY,
      nodeX: pos.x,
      nodeY: pos.y,
    }
    setDraggedHabit(habitId)
  }, [getNodePosition])

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!draggedHabit || !dragStartPos.current || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    const deltaX = ((clientX - dragStartPos.current.x) / rect.width) * 100
    const deltaY = ((clientY - dragStartPos.current.y) / rect.height) * 100

    const newX = Math.max(10, Math.min(90, dragStartPos.current.nodeX + deltaX))
    const newY = Math.max(10, Math.min(90, dragStartPos.current.nodeY + deltaY))

    setCustomPositions(prev => ({
      ...prev,
      [draggedHabit]: { x: newX, y: newY },
    }))
  }, [draggedHabit])

  const handleDragEnd = useCallback(() => {
    setDraggedHabit(null)
    dragStartPos.current = null
  }, [])

  // Attach global drag listeners
  useEffect(() => {
    if (draggedHabit) {
      window.addEventListener('mousemove', handleDragMove)
      window.addEventListener('mouseup', handleDragEnd)
      window.addEventListener('touchmove', handleDragMove, { passive: false })
      window.addEventListener('touchend', handleDragEnd)

      return () => {
        window.removeEventListener('mousemove', handleDragMove)
        window.removeEventListener('mouseup', handleDragEnd)
        window.removeEventListener('touchmove', handleDragMove)
        window.removeEventListener('touchend', handleDragEnd)
      }
    }
  }, [draggedHabit, handleDragMove, handleDragEnd])

  const handleMouseEnter = (habit: Habit, e: React.MouseEvent) => {
    if (draggedHabit) return
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const container = containerRef.current?.getBoundingClientRect()

    if (container) {
      setTooltipPosition({
        x: rect.left - container.left + rect.width / 2,
        y: rect.top - container.top,
      })
    }
    setHoveredHabit(habit.id)
  }

  const handleMouseLeave = () => {
    if (!confirmDelete && !draggedHabit) {
      setHoveredHabit(null)
    }
  }

  const getHabitColors = (habit: Habit) => {
    return categoryColors[habit.category || ''] || categoryColors.default
  }

  const hoveredHabitData = habits.find((h) => h.id === hoveredHabit)

  return (
    <div
      ref={containerRef}
      className="skill-tree-container relative w-full h-[500px] md:h-[600px] rounded-2xl overflow-hidden select-none touch-none"
    >
      {/* Dynamic background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background" />

      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Radial glow */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.3) 0%, transparent 50%)',
        }}
      />

      {/* Lightning connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
        <defs>
          <filter id="lightning-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {habits.map((habit) => {
          const pos = getNodePosition(habit.id)
          if (!pos) return null

          const pathId = `lightning-${habit.id}`
          const path = lightningPaths[pathId]
          if (!path) return null

          const isCompleted = completedIds.includes(habit.id)
          const colors = getHabitColors(habit)

          return (
            <g key={pathId}>
              {/* Glow layer */}
              <path
                d={path}
                fill="none"
                stroke={isCompleted ? '#10b981' : colors.lightning}
                strokeWidth={isCompleted ? 6 : 4}
                strokeLinecap="round"
                style={{
                  opacity: isCompleted ? 0.4 : 0.2,
                  filter: 'blur(4px)',
                }}
              />
              {/* Main lightning */}
              <path
                d={path}
                fill="none"
                stroke={isCompleted ? '#10b981' : colors.lightning}
                strokeWidth={isCompleted ? 3 : 2}
                strokeLinecap="round"
                filter="url(#lightning-glow)"
                className="transition-colors duration-300"
                style={{ opacity: isCompleted ? 1 : 0.7 }}
              />
            </g>
          )
        })}
      </svg>

      {/* Center node */}
      <div
        className="absolute w-20 h-20 md:w-24 md:h-24 transform -translate-x-1/2 -translate-y-1/2"
        style={{ left: '50%', top: '50%', zIndex: 10 }}
      >
        <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute inset-2 rounded-full border border-primary/20 animate-pulse" />
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary via-violet-500 to-purple-700 flex items-center justify-center shadow-glow-lg">
          <Swords className="w-10 h-10 md:w-12 md:h-12 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
        </div>
        <svg className="absolute inset-0 w-full h-full animate-[spin_15s_linear_infinite]">
          <circle cx="50%" cy="50%" r="48%" fill="none" stroke="hsl(var(--primary) / 0.5)" strokeWidth="2" strokeDasharray="20 10" />
        </svg>
      </div>

      {/* Habit nodes */}
      {habits.map((habit) => {
        const pos = getNodePosition(habit.id)
        if (!pos) return null

        const isCompleted = completedIds.includes(habit.id)
        const colors = getHabitColors(habit)
        const isHovered = hoveredHabit === habit.id
        const isDragging = draggedHabit === habit.id
        const Icon = getHabitIcon(habit.name, habit.description)

        return (
          <div
            key={habit.id}
            className={cn(
              'absolute transform -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing',
              isDragging ? 'duration-0 z-50 scale-110' : 'transition-all duration-300 z-20',
              isHovered && !isDragging && 'scale-110 z-40'
            )}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
            }}
            onMouseDown={(e) => handleDragStart(habit.id, e)}
            onTouchStart={(e) => handleDragStart(habit.id, e)}
            onMouseEnter={(e) => handleMouseEnter(habit, e)}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => {
              if (!isDragging) {
                e.stopPropagation()
                onToggleHabit(habit.id)
              }
            }}
          >
            <div className="relative w-14 h-14 md:w-16 md:h-16">
              {/* Hexagon */}
              <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
                <defs>
                  <linearGradient id={`hex-grad-${habit.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    {isCompleted ? (
                      <>
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </>
                    ) : (
                      <>
                        <stop offset="0%" stopColor="hsl(260 30% 15%)" />
                        <stop offset="100%" stopColor="hsl(260 35% 10%)" />
                      </>
                    )}
                  </linearGradient>
                  <filter id={`node-glow-${habit.id}`} x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <polygon
                  points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"
                  fill={`url(#hex-grad-${habit.id})`}
                  stroke={isCompleted ? '#10b981' : colors.lightning}
                  strokeWidth={isHovered || isDragging ? 4 : 2}
                  filter={(isHovered || isDragging) ? `url(#node-glow-${habit.id})` : undefined}
                  className="transition-all duration-300"
                />
                <polygon
                  points="50,12 88,32 88,68 50,88 12,68 12,32"
                  fill="none"
                  stroke={isCompleted ? 'rgba(16,185,129,0.4)' : `${colors.lightning}33`}
                  strokeWidth="1"
                />
              </svg>

              {/* Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                {isCompleted ? (
                  <Check className="w-7 h-7 md:w-8 md:h-8 text-white drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                ) : (
                  <Icon className="w-6 h-6 md:w-7 md:h-7 drop-shadow-[0_0_8px_currentColor]" style={{ color: colors.lightning }} />
                )}
              </div>

              {/* Completion effects */}
              {isCompleted && (
                <div className="absolute inset-0 animate-ping opacity-30">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <polygon points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" fill="none" stroke="#10b981" strokeWidth="2" />
                  </svg>
                </div>
              )}

              {/* Drag indicator */}
              {isHovered && !isDragging && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary/80 rounded-full flex items-center justify-center animate-bounce">
                  <GripVertical className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Tooltip */}
      {hoveredHabitData && !draggedHabit && (
        <div
          className="absolute z-50 pointer-events-auto animate-fade-in"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y - 10,
            transform: 'translate(-50%, -100%)',
          }}
          onMouseEnter={() => setHoveredHabit(hoveredHabitData.id)}
          onMouseLeave={() => { if (!confirmDelete) setHoveredHabit(null) }}
        >
          <div className="relative">
            <div className="glass border border-primary/30 text-foreground rounded-xl shadow-2xl min-w-[240px] max-w-[300px] overflow-hidden">
              <div className="bg-gradient-to-r from-primary/20 to-transparent p-3 border-b border-primary/20">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center">
                      {(() => {
                        const Icon = getHabitIcon(hoveredHabitData.name, hoveredHabitData.description)
                        const colors = getHabitColors(hoveredHabitData)
                        return <Icon className="w-6 h-6" style={{ color: colors.lightning }} />
                      })()}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">{hoveredHabitData.name}</h3>
                      {hoveredHabitData.category && <span className="text-xs text-primary">{hoveredHabitData.category}</span>}
                    </div>
                  </div>

                  {confirmDelete === hoveredHabitData.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); onDeleteHabit(hoveredHabitData.id); setConfirmDelete(null); setHoveredHabit(null) }} className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(null) }} className="p-1.5 bg-muted text-muted-foreground rounded-lg">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(hoveredHabitData.id) }} className="p-1.5 text-muted-foreground hover:text-red-400 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 space-y-3">
                {hoveredHabitData.description && <p className="text-xs text-muted-foreground line-clamp-2">{hoveredHabitData.description}</p>}
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 rounded-lg bg-secondary/50 text-xs flex items-center gap-1"><Calendar className="w-3 h-3" />{hoveredHabitData.frequency}</span>
                  {hoveredHabitData.reminderTime && <span className="px-2 py-1 rounded-lg bg-secondary/50 text-xs flex items-center gap-1"><Clock className="w-3 h-3" />{hoveredHabitData.reminderTime}</span>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onViewPlan(hoveredHabitData); setHoveredHabit(null) }}
                    className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-xs font-medium transition-colors"
                  >
                    <BookOpen className="w-4 h-4" />
                    View Plan
                  </button>
                  <div className={cn('flex-1 flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-medium', completedIds.includes(hoveredHabitData.id) ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary/10 text-primary')}>
                    {completedIds.includes(hoveredHabitData.id) ? <><Zap className="w-4 h-4" />Done!</> : <><Swords className="w-4 h-4" />Complete</>}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">Drag to reposition</p>
              </div>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-card" />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="absolute top-3 right-3 glass rounded-xl p-3" style={{ zIndex: 30 }}>
        <div className="text-center">
          <div className="text-2xl font-bold">{completedIds.length}/{habits.length}</div>
          <div className="text-xs text-muted-foreground">Quests</div>
        </div>
      </div>

      {/* Power level */}
      <div className="absolute bottom-3 left-3 glass rounded-xl p-3" style={{ zIndex: 30 }}>
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary animate-pulse" />
          <div>
            <div className="text-sm font-bold">LVL {Math.floor(completedIds.length * 10 / Math.max(habits.length, 1))}</div>
            <div className="text-xs text-muted-foreground">Power</div>
          </div>
        </div>
      </div>
    </div>
  )
}
