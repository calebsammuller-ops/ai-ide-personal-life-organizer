'use client'

import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  fetchGamificationStats,
  selectGamificationStats,
  selectCurrentLevel,
  selectLevelProgress,
  selectCurrentStreak,
  selectWeeklyStats,
  selectGamificationLoading,
} from '@/state/slices/gamificationSlice'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Flame, Zap, Trophy, Target, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GamificationWidgetProps {
  compact?: boolean
}

export function GamificationWidget({ compact = false }: GamificationWidgetProps) {
  const dispatch = useAppDispatch()
  const stats = useAppSelector(selectGamificationStats)
  const currentLevel = useAppSelector(selectCurrentLevel)
  const levelProgress = useAppSelector(selectLevelProgress)
  const currentStreak = useAppSelector(selectCurrentStreak)
  const weeklyStats = useAppSelector(selectWeeklyStats)
  const isLoading = useAppSelector(selectGamificationLoading)

  useEffect(() => {
    dispatch(fetchGamificationStats())
  }, [dispatch])

  if (isLoading && !stats) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-purple-500/10 border">
        <div className="text-2xl">{currentLevel.badge}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Level {currentLevel.level}</span>
            <span className="text-xs text-muted-foreground">{currentLevel.name}</span>
          </div>
          <Progress value={levelProgress.percentage} className="h-1.5 mt-1" />
        </div>
        <div className="flex items-center gap-1 text-orange-500">
          <Flame className="h-4 w-4" />
          <span className="font-bold text-sm">{currentStreak}</span>
        </div>
      </div>
    )
  }

  return (
    <Card className="overflow-hidden">
      {/* Header with level info */}
      <div className="bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 p-4">
        <div className="flex items-center gap-4">
          <div className="text-4xl">{currentLevel.badge}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">Level {currentLevel.level}</span>
              <Badge variant="secondary" className="text-xs">
                {currentLevel.name}
              </Badge>
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{stats?.totalXp.toLocaleString() || 0} XP</span>
                <span>{currentLevel.maxXp === Infinity ? '∞' : currentLevel.maxXp.toLocaleString()} XP</span>
              </div>
              <Progress value={levelProgress.percentage} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {levelProgress.needed - levelProgress.current} XP to next level
              </p>
            </div>
          </div>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Streak */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 mb-4">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <div>
              <p className="font-semibold">Daily Streak</p>
              <p className="text-xs text-muted-foreground">
                Best: {stats?.longestDailyStreak || 0} days
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-orange-500">{currentStreak}</span>
            <span className="text-sm text-muted-foreground ml-1">days</span>
          </div>
        </div>

        {/* Weekly Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Zap className="h-4 w-4 text-yellow-500" />}
            label="XP This Week"
            value={weeklyStats.xpEarned.toLocaleString()}
            color="yellow"
          />
          <StatCard
            icon={<Target className="h-4 w-4 text-green-500" />}
            label="Tasks Done"
            value={weeklyStats.tasksCompleted.toString()}
            color="green"
          />
          <StatCard
            icon={<Trophy className="h-4 w-4 text-purple-500" />}
            label="Habits Done"
            value={weeklyStats.habitsCompleted.toString()}
            color="purple"
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4 text-blue-500" />}
            label="Focus Minutes"
            value={weeklyStats.focusMinutes.toString()}
            color="blue"
          />
        </div>

        {/* Recent Achievements */}
        {stats && stats.unlockedAchievementIds.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-semibold mb-2">Recent Achievements</p>
            <div className="flex flex-wrap gap-2">
              {stats.achievements
                .filter(a => a.unlockedAt)
                .slice(0, 5)
                .map(achievement => (
                  <div
                    key={achievement.id}
                    className="flex items-center gap-1 px-2 py-1 rounded-full bg-accent text-xs"
                    title={achievement.description}
                  >
                    <span>{achievement.icon}</span>
                    <span>{achievement.name}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: 'yellow' | 'green' | 'purple' | 'blue'
}) {
  const bgColors = {
    yellow: 'bg-yellow-500/10',
    green: 'bg-green-500/10',
    purple: 'bg-purple-500/10',
    blue: 'bg-blue-500/10',
  }

  return (
    <div className={cn('p-3 rounded-lg', bgColors[color])}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-bold">{value}</p>
    </div>
  )
}
