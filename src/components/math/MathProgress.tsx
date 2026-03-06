'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Target, Flame, Brain, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import { fetchStats, selectMathStats, selectMathLoading } from '@/state/slices/mathSlice'
import { cn } from '@/lib/utils'

export function MathProgress() {
  const dispatch = useAppDispatch()
  const stats = useAppSelector(selectMathStats)
  const isLoading = useAppSelector(selectMathLoading)

  useEffect(() => {
    dispatch(fetchStats())
  }, [dispatch])

  const accuracy =
    stats && stats.totalProblemsSolved > 0
      ? Math.round((stats.totalCorrect / stats.totalProblemsSolved) * 100)
      : 0

  if (isLoading && !stats) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-purple-500/20 animate-pulse">
            <CardContent className="p-6 h-24" />
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Problems Solved',
            value: stats?.totalProblemsSolved ?? 0,
            icon: Target,
            color: 'text-purple-400',
          },
          {
            label: 'Accuracy',
            value: `${accuracy}%`,
            icon: TrendingUp,
            color: 'text-green-400',
          },
          {
            label: 'Current Streak',
            value: stats?.currentStreak ?? 0,
            icon: Flame,
            color: 'text-orange-400',
          },
          {
            label: 'Best Streak',
            value: stats?.bestStreak ?? 0,
            icon: Trophy,
            color: 'text-yellow-400',
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-purple-500/20">
              <CardContent className="p-4 text-center">
                <stat.icon className={cn('h-5 w-5 mx-auto mb-2', stat.color)} />
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Streak display */}
      <Card className="border-purple-500/20 bg-purple-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-purple-300 flex items-center gap-2">
            <Flame className="h-4 w-4" />
            Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-400">{stats?.currentStreak ?? 0}</p>
              <p className="text-xs text-muted-foreground">Current</p>
            </div>
            <div className="flex-1 h-px bg-purple-500/20" />
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-400">{stats?.bestStreak ?? 0}</p>
              <p className="text-xs text-muted-foreground">Best</p>
            </div>
          </div>
          {stats?.lastPracticedAt && (
            <p className="text-xs text-muted-foreground mt-3">
              Last practiced: {new Date(stats.lastPracticedAt).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Topic mastery */}
      <Card className="border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-sm text-purple-300 flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Topic Mastery
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats?.topicScores && Object.keys(stats.topicScores).length > 0 ? (
            Object.entries(stats.topicScores).map(([topic, scores], index) => {
              const topicAccuracy =
                scores.solved > 0 ? Math.round((scores.correct / scores.solved) * 100) : 0
              const isMastered = stats.topicsMastered?.includes(topic)
              const isWeak = stats.weakTopics?.includes(topic)

              return (
                <motion.div
                  key={topic}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize">{topic.replace('_', ' ')}</span>
                      {isMastered && (
                        <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-400">
                          Mastered
                        </Badge>
                      )}
                      {isWeak && (
                        <Badge variant="secondary" className="text-xs bg-red-500/10 text-red-400">
                          Needs Work
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {scores.correct}/{scores.solved} ({topicAccuracy}%)
                    </span>
                  </div>
                  <Progress
                    value={topicAccuracy}
                    className={cn(
                      'h-2',
                      topicAccuracy >= 80
                        ? '[&>div]:bg-green-500'
                        : topicAccuracy >= 50
                        ? '[&>div]:bg-yellow-500'
                        : '[&>div]:bg-red-500'
                    )}
                  />
                </motion.div>
              )
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No topic data yet. Start practicing to see your progress!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
