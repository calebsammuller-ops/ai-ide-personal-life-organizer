'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Flame,
  Zap,
  Trophy,
  Target,
  TrendingUp,
  Calendar,
  CheckSquare,
  Clock,
  Star,
  Lock,
  Award,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { PageContainer } from '@/components/layout/PageContainer'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  fetchGamificationStats,
  selectGamificationStats,
  selectCurrentLevel,
  selectLevelProgress,
  selectCurrentStreak,
  selectLongestStreak,
  selectWeeklyStats,
  selectAllAchievements,
  selectGamificationLoading,
} from '@/state/slices/gamificationSlice'
import { LEVELS, ACHIEVEMENTS } from '@/types/gamification'
import { cn } from '@/lib/utils'

export default function ProgressPage() {
  const dispatch = useAppDispatch()
  const stats = useAppSelector(selectGamificationStats)
  const currentLevel = useAppSelector(selectCurrentLevel)
  const levelProgress = useAppSelector(selectLevelProgress)
  const currentStreak = useAppSelector(selectCurrentStreak)
  const longestStreak = useAppSelector(selectLongestStreak)
  const weeklyStats = useAppSelector(selectWeeklyStats)
  const allAchievements = useAppSelector(selectAllAchievements)
  const isLoading = useAppSelector(selectGamificationLoading)

  useEffect(() => {
    dispatch(fetchGamificationStats())
  }, [dispatch])

  const unlockedCount = allAchievements.filter(a => a.unlockedAt).length

  if (isLoading && !stats) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="h-40 bg-muted rounded" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-muted rounded" />
              ))}
            </div>
          </div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Your Progress</h2>
          <p className="text-muted-foreground">Track your growth and achievements</p>
        </div>

        {/* Level Card - Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 p-6">
              <div className="flex items-center gap-6">
                <motion.div
                  className="text-6xl"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  {currentLevel.badge}
                </motion.div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-3xl font-bold">Level {currentLevel.level}</span>
                    <Badge variant="secondary" className="text-sm">
                      {currentLevel.name}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {stats?.totalXp.toLocaleString() || 0} total XP earned
                  </p>
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{levelProgress.current.toLocaleString()} / {levelProgress.needed === Infinity ? '∞' : levelProgress.needed.toLocaleString()} XP</span>
                      <span>{levelProgress.percentage}%</span>
                    </div>
                    <Progress value={levelProgress.percentage} className="h-3" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {currentLevel.maxXp === Infinity
                        ? 'Max level reached!'
                        : `${(levelProgress.needed - levelProgress.current).toLocaleString()} XP to Level ${currentLevel.level + 1}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Key Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              icon: Flame,
              label: 'Current Streak',
              value: `${currentStreak} days`,
              sublabel: `Best: ${longestStreak} days`,
              color: 'text-orange-500',
              bg: 'bg-orange-500/10',
            },
            {
              icon: Zap,
              label: 'Weekly XP',
              value: weeklyStats.xpEarned.toLocaleString(),
              sublabel: 'XP earned this week',
              color: 'text-yellow-500',
              bg: 'bg-yellow-500/10',
            },
            {
              icon: Trophy,
              label: 'Achievements',
              value: `${unlockedCount}/${ACHIEVEMENTS.length}`,
              sublabel: `${Math.round((unlockedCount / ACHIEVEMENTS.length) * 100)}% unlocked`,
              color: 'text-purple-500',
              bg: 'bg-purple-500/10',
            },
            {
              icon: Calendar,
              label: 'Days Active',
              value: (stats?.lifetimeDaysActive ?? 0).toString(),
              sublabel: 'Lifetime days',
              color: 'text-blue-500',
              bg: 'bg-blue-500/10',
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className={cn('inline-flex p-2 rounded-lg mb-2', stat.bg)}>
                    <stat.icon className={cn('h-5 w-5', stat.color)} />
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">{stat.sublabel}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts Row — Toggl-inspired */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* XP breakdown donut */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Activity Breakdown</CardTitle>
              <CardDescription>This week's completed actions</CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const donutData = [
                  { name: 'Tasks',  value: weeklyStats.tasksCompleted,  color: '#8b5cf6' },
                  { name: 'Habits', value: weeklyStats.habitsCompleted, color: '#06b6d4' },
                  { name: 'Focus',  value: Math.round(weeklyStats.focusMinutes / 10), color: '#f59e0b' },
                ].filter(d => d.value > 0)
                const total = donutData.reduce((s, d) => s + d.value, 0)
                if (total === 0) {
                  return <p className="text-sm text-muted-foreground text-center py-8">No activity yet this week</p>
                }
                return (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width={140} height={140}>
                      <PieChart>
                        <Pie
                          data={donutData}
                          cx="50%" cy="50%"
                          innerRadius={42} outerRadius={62}
                          paddingAngle={3}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {donutData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: '#a1a1aa' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {donutData.map((d) => (
                        <div key={d.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                            <span className="text-xs text-muted-foreground">{d.name}</span>
                          </div>
                          <span className="text-xs font-semibold text-zinc-200">
                            {Math.round((d.value / total) * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </CardContent>
          </Card>

          {/* Weekly XP bar chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Weekly Performance</CardTitle>
              <CardDescription>Tasks · Habits · Focus (×10 min) this week</CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const barData = [
                  { name: 'Tasks',  value: weeklyStats.tasksCompleted,  fill: '#8b5cf6' },
                  { name: 'Habits', value: weeklyStats.habitsCompleted, fill: '#06b6d4' },
                  { name: 'Focus',  value: Math.round(weeklyStats.focusMinutes / 10), fill: '#f59e0b' },
                  { name: 'XP',     value: Math.round(weeklyStats.xpEarned / 10),    fill: '#10b981' },
                ]
                return (
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={barData} barSize={28} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#52525b' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                        contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {barData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Lifetime Stats + Weekly Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Lifetime Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Lifetime Stats
              </CardTitle>
              <CardDescription>Your all-time accomplishments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatRow
                icon={<Target className="h-4 w-4 text-green-500" />}
                label="Tasks Completed"
                value={stats?.lifetimeTasksCompleted ?? 0}
              />
              <StatRow
                icon={<CheckSquare className="h-4 w-4 text-blue-500" />}
                label="Habits Completed"
                value={stats?.lifetimeHabitsCompleted ?? 0}
              />
              <StatRow
                icon={<Clock className="h-4 w-4 text-purple-500" />}
                label="Focus Minutes"
                value={stats?.lifetimeFocusMinutes ?? 0}
                suffix="min"
              />
              <StatRow
                icon={<Flame className="h-4 w-4 text-orange-500" />}
                label="Longest Streak"
                value={longestStreak}
                suffix="days"
              />
              <StatRow
                icon={<Zap className="h-4 w-4 text-yellow-500" />}
                label="Total XP"
                value={stats?.totalXp ?? 0}
                suffix="XP"
              />
            </CardContent>
          </Card>

          {/* This Week */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                This Week
              </CardTitle>
              <CardDescription>Your performance this week</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatRow
                icon={<Zap className="h-4 w-4 text-yellow-500" />}
                label="XP Earned"
                value={weeklyStats.xpEarned}
                suffix="XP"
              />
              <StatRow
                icon={<Target className="h-4 w-4 text-green-500" />}
                label="Tasks Done"
                value={weeklyStats.tasksCompleted}
              />
              <StatRow
                icon={<CheckSquare className="h-4 w-4 text-blue-500" />}
                label="Habits Done"
                value={weeklyStats.habitsCompleted}
              />
              <StatRow
                icon={<Clock className="h-4 w-4 text-purple-500" />}
                label="Focus Time"
                value={weeklyStats.focusMinutes}
                suffix="min"
              />
            </CardContent>
          </Card>
        </div>

        {/* Level Roadmap */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Level Roadmap
            </CardTitle>
            <CardDescription>Your journey through the ranks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {LEVELS.map((level) => {
                const isReached = (stats?.totalXp ?? 0) >= level.minXp
                const isCurrent = currentLevel.level === level.level
                return (
                  <motion.div
                    key={level.level}
                    whileHover={{ scale: 1.05 }}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
                      isCurrent && 'border-primary bg-primary/10 ring-2 ring-primary/30',
                      isReached && !isCurrent && 'border-green-500/30 bg-green-500/5',
                      !isReached && 'opacity-50'
                    )}
                  >
                    <span className="text-xl">{level.badge}</span>
                    <div>
                      <p className={cn('text-xs font-semibold', isCurrent && 'text-primary')}>
                        Lv. {level.level}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{level.name}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Achievements Gallery */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Achievements
            </CardTitle>
            <CardDescription>
              {unlockedCount} of {ACHIEVEMENTS.length} unlocked
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Category filter tabs */}
            {(['all', 'habits', 'tasks', 'focus', 'streaks', 'milestones', 'special'] as const).map(cat => {
              const catAchievements = cat === 'all'
                ? allAchievements
                : allAchievements.filter(a => a.category === cat)
              const catUnlocked = catAchievements.filter(a => a.unlockedAt).length

              if (cat !== 'all' && catAchievements.length === 0) return null

              return (
                <div key={cat} className={cn(cat !== 'all' && 'mt-6', cat === 'all' && 'hidden')}>
                  <h4 className="text-sm font-semibold capitalize mb-3 flex items-center gap-2">
                    {cat}
                    <Badge variant="outline" className="text-xs">
                      {catUnlocked}/{catAchievements.length}
                    </Badge>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {catAchievements.map((achievement, index) => {
                      const isUnlocked = !!achievement.unlockedAt
                      return (
                        <motion.div
                          key={achievement.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.03 }}
                          className={cn(
                            'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                            isUnlocked
                              ? 'bg-accent/50 border-primary/20'
                              : 'opacity-60 bg-muted/30'
                          )}
                        >
                          <div className={cn(
                            'text-2xl flex-shrink-0',
                            !isUnlocked && 'grayscale'
                          )}>
                            {isUnlocked ? achievement.icon : <Lock className="h-6 w-6 text-muted-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{achievement.name}</p>
                            <p className="text-xs text-muted-foreground">{achievement.description}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <Zap className="h-3 w-3 text-yellow-500" />
                              <span className="text-xs text-yellow-500 font-medium">
                                +{achievement.xpReward} XP
                              </span>
                            </div>
                          </div>
                          {isUnlocked && (
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              Unlocked
                            </Badge>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Show all achievements when 'all' category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allAchievements.map((achievement, index) => {
                const isUnlocked = !!achievement.unlockedAt
                return (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                      isUnlocked
                        ? 'bg-accent/50 border-primary/20'
                        : 'opacity-60 bg-muted/30'
                    )}
                  >
                    <div className={cn(
                      'text-2xl flex-shrink-0',
                      !isUnlocked && 'grayscale'
                    )}>
                      {isUnlocked ? achievement.icon : <Lock className="h-6 w-6 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{achievement.name}</p>
                      <p className="text-xs text-muted-foreground">{achievement.description}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Zap className="h-3 w-3 text-yellow-500" />
                        <span className="text-xs text-yellow-500 font-medium">
                          +{achievement.xpReward} XP
                        </span>
                      </div>
                    </div>
                    {isUnlocked && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        Unlocked
                      </Badge>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </PageContainer>
  )
}

function StatRow({
  icon,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode
  label: string
  value: number
  suffix?: string
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="font-semibold">
        {value.toLocaleString()}{suffix ? ` ${suffix}` : ''}
      </span>
    </div>
  )
}
