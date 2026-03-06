'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Flame, Target, LayoutGrid, GitBranch, BookOpen } from 'lucide-react'
import confetti from 'canvas-confetti'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/layout/PageContainer'
import { FAB } from '@/components/common/FAB'
import { EmptyState } from '@/components/common/EmptyState'
import { HabitSkillTree } from '@/components/habits/HabitSkillTree'
import { HabitHeatmap } from '@/components/habits/HabitHeatmap'
import { TacticalMascot } from '@/components/ui/TacticalMascot'
import { FadeIn, HoverCard, AnimatedProgress } from '@/components/ui/animated'
import { CelebrationToast } from '@/components/ui/celebration'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  selectActiveHabits,
  selectTodayCompletions,
  selectAllCompletions,
  fetchHabits,
  fetchCompletions,
  completeHabit,
  uncompleteHabit,
  deleteHabit,
  setSelectedHabit,
} from '@/state/slices/habitsSlice'
import { openModal } from '@/state/slices/uiSlice'
import { cn } from '@/lib/utils'
import { useRegisterPageContext } from '@/hooks/useRegisterPageContext'
import { useToast } from '@/components/ui/toaster'
import type { Habit } from '@/types'

type ViewMode = 'list' | 'tree'

export default function HabitsPage() {
  const dispatch = useAppDispatch()
  const habits = useAppSelector(selectActiveHabits)
  const todayCompletions = useAppSelector(selectTodayCompletions)
  const allCompletions = useAppSelector(selectAllCompletions)
  const [viewMode, setViewMode] = useState<ViewMode>('tree')
  const { toast } = useToast()

  useRegisterPageContext({
    pageTitle: 'Habits',
    activeView: viewMode,
    visibleContent: {
      type: 'habits',
      activeHabitCount: habits.length,
      completedTodayCount: todayCompletions.length,
    },
  })

  useEffect(() => {
    dispatch(fetchHabits())
  }, [dispatch])

  // Fetch last 16 weeks of completions for all habits (for heatmap)
  useEffect(() => {
    if (habits.length === 0) return
    const endDate = new Date().toISOString().split('T')[0]
    const startD = new Date()
    startD.setDate(startD.getDate() - 16 * 7)
    const startDate = startD.toISOString().split('T')[0]
    habits.forEach((h) => {
      dispatch(fetchCompletions({ habitId: h.id, startDate, endDate }))
    })
  }, [dispatch, habits.length])

  const today = new Date().toISOString().split('T')[0]
  const completionRate = habits.length > 0
    ? Math.round((todayCompletions.length / habits.length) * 100)
    : 0

  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationMessage, setCelebrationMessage] = useState('')

  const handleToggleHabit = (habitId: string) => {
    const isCompleted = todayCompletions.includes(habitId)
    if (isCompleted) {
      dispatch(uncompleteHabit({ habitId, date: today }))
    } else {
      dispatch(completeHabit({ habitId, date: today }))

      // Trigger mini confetti
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#10b981', '#3b82f6', '#8b5cf6'],
      })

      // Check if all habits are done
      if (todayCompletions.length + 1 === habits.length) {
        setCelebrationMessage('All habits done! 🎉')
        setShowCelebration(true)
        // Big celebration
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        })
      }

      toast({
        title: 'Habit completed!',
        description: 'Great job staying on track.',
        variant: 'success',
      })
    }
  }

  const handleDeleteHabit = async (habitId: string) => {
    try {
      await dispatch(deleteHabit(habitId)).unwrap()
      toast({
        title: 'Habit deleted',
        description: 'The habit has been removed.',
        variant: 'success',
      })
    } catch {
      toast({
        title: 'Failed to delete habit',
        description: 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleViewPlan = (habit: Habit) => {
    dispatch(setSelectedHabit(habit))
    dispatch(openModal({ modalName: 'habitPlan', data: { habit } }))
  }

  return (
    <PageContainer>
      <CelebrationToast
        show={showCelebration}
        message={celebrationMessage}
        xp={20}
        onComplete={() => setShowCelebration(false)}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Header */}
        <FadeIn className="flex items-center gap-3 mb-4">
          <TacticalMascot
            mood={completionRate === 100 ? 'celebrating' : completionRate >= 50 ? 'encouraging' : 'greeting'}
            size="sm"
          />
          <div>
            <h1 className="text-xs font-mono font-bold uppercase tracking-widest">PROTOCOLS</h1>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
              {completionRate === 100 ? 'ALL PROTOCOLS COMPLETE' : completionRate >= 50 ? 'STAY ON TARGET' : 'BUILD DISCIPLINE'}
            </p>
          </div>
        </FadeIn>

        {/* Stats Cards with Animation */}
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Today's Progress",
              value: `${completionRate}%`,
              hasProgress: true,
              icon: null,
              color: 'from-green-500 to-emerald-500',
            },
            {
              title: 'Active Habits',
              value: habits.length,
              icon: Target,
              iconColor: 'text-primary',
              color: 'from-blue-500 to-cyan-500',
            },
            {
              title: 'Completed Today',
              value: todayCompletions.length,
              icon: Flame,
              iconColor: 'text-orange-500',
              color: 'from-orange-500 to-amber-500',
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <HoverCard>
                <Card className="relative overflow-hidden group">
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <motion.div
                      key={String(stat.value)}
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      className="text-2xl font-bold flex items-center gap-2"
                    >
                      {stat.icon && (
                        <motion.div whileHover={{ rotate: 15, scale: 1.2 }}>
                          <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                        </motion.div>
                      )}
                      {stat.value}
                    </motion.div>
                    {stat.hasProgress && <AnimatedProgress value={completionRate} className="mt-2" />}
                  </CardContent>
                </Card>
              </HoverCard>
            </motion.div>
          ))}
        </div>

        {/* Completion Heatmap */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Completion History</CardTitle>
          </CardHeader>
          <CardContent>
            <HabitHeatmap completions={allCompletions} habitCount={habits.length} />
          </CardContent>
        </Card>

        {/* View Toggle and Habits Display */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Today&apos;s Habits</CardTitle>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === 'tree' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('tree')}
                className="gap-2"
              >
                <GitBranch className="h-4 w-4" />
                Skill Tree
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="gap-2"
              >
                <LayoutGrid className="h-4 w-4" />
                List
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {habits.length === 0 ? (
              <EmptyState
                icon={Target}
                title="No habits yet"
                description="Start building positive habits by creating your first one"
                actionLabel="Create Habit"
                onAction={() => dispatch(openModal({ modalName: 'createHabit' }))}
              />
            ) : viewMode === 'tree' ? (
              <HabitSkillTree
                habits={habits}
                completedIds={todayCompletions}
                onToggleHabit={handleToggleHabit}
                onDeleteHabit={handleDeleteHabit}
                onViewPlan={handleViewPlan}
              />
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {habits.map((habit, index) => {
                    const isCompleted = todayCompletions.includes(habit.id)
                    return (
                      <motion.div
                        key={habit.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.01 }}
                        className={cn(
                          'flex items-center gap-4 p-4 rounded-lg border transition-colors',
                          isCompleted ? 'bg-primary/5 border-primary/20' : 'hover:bg-accent'
                        )}
                      >
                        <motion.button
                          onClick={() => handleToggleHabit(habit.id)}
                          whileTap={{ scale: 0.9 }}
                          animate={isCompleted ? { scale: [1, 1.2, 1] } : {}}
                          className={cn(
                            'w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all touch-target',
                            isCompleted
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-muted-foreground hover:border-primary'
                          )}
                        >
                          <AnimatePresence>
                            {isCompleted && (
                              <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0, rotate: 180 }}
                              >
                                <Check className="h-5 w-5" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.button>

                        <div
                          className="flex-1 min-w-0 cursor-pointer group/habit"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewPlan(habit)
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <motion.span
                              animate={isCompleted ? { rotate: [0, 15, -15, 0] } : {}}
                              className="text-lg"
                            >
                              {habit.icon}
                            </motion.span>
                            <p className={cn(
                              'font-medium transition-all group-hover/habit:text-primary',
                              isCompleted && 'line-through text-muted-foreground'
                            )}>
                              {habit.name}
                            </p>
                            <BookOpen className="w-4 h-4 text-muted-foreground opacity-0 group-hover/habit:opacity-100 transition-opacity" />
                          </div>
                          {habit.description && (
                            <p className="text-sm text-muted-foreground truncate">
                              {habit.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewPlan(habit)
                            }}
                          >
                            <BookOpen className="w-4 h-4 mr-1" />
                            Plan
                          </Button>
                          {habit.category && (
                            <Badge variant="secondary">{habit.category}</Badge>
                          )}
                          <Badge
                            variant={habit.frequency === 'daily' ? 'default' : 'outline'}
                          >
                            {habit.frequency}
                          </Badge>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <FAB onClick={() => dispatch(openModal({ modalName: 'createHabit' }))} label="Add Habit" />
    </PageContainer>
  )
}
