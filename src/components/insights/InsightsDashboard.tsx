'use client'

import { useEffect } from 'react'
import {
  Brain,
  Clock,
  Calendar,
  TrendingUp,
  Lightbulb,
  RefreshCw,
  BarChart3,
  Utensils,
  Zap,
  Trophy,
  Flame,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  fetchLearnedPatterns,
  triggerPatternAnalysis,
  selectLearnedPatterns,
  selectIsAnalyzing,
  selectLastAnalyzedAt,
  selectPreferencesError,
} from '@/state/slices/preferencesSlice'
import {
  fetchGamificationStats,
  selectGamificationStats,
  selectCurrentLevel,
  selectLevelProgress,
  selectCurrentStreak,
  selectWeeklyStats,
  selectAllAchievements,
} from '@/state/slices/gamificationSlice'
import { cn } from '@/lib/utils'
import { GamificationWidget } from '@/components/gamification/GamificationWidget'

export function InsightsDashboard() {
  const dispatch = useAppDispatch()
  const patterns = useAppSelector(selectLearnedPatterns)
  const isAnalyzing = useAppSelector(selectIsAnalyzing)
  const lastAnalyzedAt = useAppSelector(selectLastAnalyzedAt)
  const error = useAppSelector(selectPreferencesError)

  // Gamification selectors
  const stats = useAppSelector(selectGamificationStats)
  const currentLevel = useAppSelector(selectCurrentLevel)
  const levelProgress = useAppSelector(selectLevelProgress)
  const currentStreak = useAppSelector(selectCurrentStreak)
  const weeklyStats = useAppSelector(selectWeeklyStats)
  const allAchievements = useAppSelector(selectAllAchievements)

  const unlockedAchievements = allAchievements.filter(a => a.unlockedAt)
  const achievementProgress = Math.round((unlockedAchievements.length / allAchievements.length) * 100)

  useEffect(() => {
    dispatch(fetchLearnedPatterns())
    dispatch(fetchGamificationStats())
  }, [dispatch])

  const handleAnalyze = () => {
    dispatch(triggerPatternAnalysis())
  }

  const formatLastAnalyzed = () => {
    if (!lastAnalyzedAt) return 'Never'
    const date = new Date(lastAnalyzedAt)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays} days ago`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Personal Insights</h2>
          <p className="text-muted-foreground">
            Last analyzed: {formatLastAnalyzed()}
          </p>
        </div>
        <Button onClick={handleAnalyze} disabled={isAnalyzing}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isAnalyzing && "animate-spin")} />
          {isAnalyzing ? 'Analyzing...' : 'Refresh Insights'}
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Gamification Section */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GamificationWidget />
        </div>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Achievements Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>{unlockedAchievements.length} unlocked</span>
                <span>{allAchievements.length} total</span>
              </div>
              <Progress value={achievementProgress} />
            </div>
            <div className="flex flex-wrap gap-2">
              {unlockedAchievements.slice(0, 6).map(achievement => (
                <div
                  key={achievement.id}
                  className="text-xl"
                  title={`${achievement.name}: ${achievement.description}`}
                >
                  {achievement.icon}
                </div>
              ))}
              {unlockedAchievements.length > 6 && (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  +{unlockedAchievements.length - 6}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <hr className="my-6" />

      {/* Pattern Analysis Section */}
      <h3 className="text-lg font-semibold mb-4">Behavior Patterns</h3>

      {!patterns ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No patterns analyzed yet</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Click &quot;Refresh Insights&quot; to analyze your activity patterns from the last 30 days.
              The more you use the app, the better insights you&apos;ll get!
            </p>
            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
              <Brain className="h-4 w-4 mr-2" />
              Analyze My Patterns
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Productive Hours */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-blue-500" />
                Most Productive Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {patterns.mostProductiveHours?.length > 0 ? (
                  patterns.mostProductiveHours.map((hour) => (
                    <Badge key={hour} variant="secondary" className="bg-blue-100 text-blue-800">
                      {hour}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Not enough data yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Best Days */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-green-500" />
                Best Days for Habits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {patterns.habitSuccessDays?.length > 0 ? (
                  patterns.habitSuccessDays.map((day) => (
                    <Badge key={day} variant="secondary" className="bg-green-100 text-green-800">
                      {day}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Not enough data yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Peak Energy */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-yellow-500" />
                Peak Energy Times
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {patterns.peakEnergyTimes?.length > 0 ? (
                  patterns.peakEnergyTimes.map((time) => (
                    <Badge key={time} variant="outline" className="capitalize">
                      {time}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Not enough data yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Common Meal Types */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Utensils className="h-4 w-4 text-orange-500" />
                Most Tracked Meals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {patterns.commonMealTypes?.length > 0 ? (
                  patterns.commonMealTypes.map((type) => (
                    <Badge key={type} variant="secondary" className="bg-orange-100 text-orange-800 capitalize">
                      {type}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Not enough data yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Event Duration Preferences */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-purple-500" />
                Typical Event Durations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.keys(patterns.preferredEventDurations || {}).length > 0 ? (
                  Object.entries(patterns.preferredEventDurations).map(([category, duration]) => (
                    <div key={category} className="flex justify-between text-sm">
                      <span className="capitalize text-muted-foreground">{category}</span>
                      <span className="font-medium">{duration} min</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Not enough data yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Work Blocks */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                Preferred Work Blocks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {patterns.preferredWorkBlocks?.length > 0 ? (
                  patterns.preferredWorkBlocks.map((block, index) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium">{block.start} - {block.end}</span>
                      <span className="text-muted-foreground ml-2">({block.avgDuration} min avg)</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Not enough data yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Scheduling Suggestions - Full Width */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Scheduling Suggestions
              </CardTitle>
              <CardDescription>Personalized recommendations based on your patterns</CardDescription>
            </CardHeader>
            <CardContent>
              {patterns.optimalScheduleSuggestions?.length > 0 ? (
                <ul className="space-y-2">
                  {patterns.optimalScheduleSuggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-amber-500 mt-0.5">-</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Keep using the app to get personalized scheduling suggestions!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Key Insights - Full Width */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="h-4 w-4 text-pink-500" />
                Key Insights
              </CardTitle>
              <CardDescription>What we&apos;ve learned about your patterns</CardDescription>
            </CardHeader>
            <CardContent>
              {patterns.insights?.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {patterns.insights.map((insight, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg bg-gradient-to-br from-muted/50 to-muted text-sm border"
                    >
                      {insight}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Continue tracking your habits, events, and meals to unlock insights!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Habit Correlations */}
          {patterns.habitCorrelations && patterns.habitCorrelations.length > 0 && (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-cyan-500" />
                  Habit Correlations
                </CardTitle>
                <CardDescription>Habits that tend to be completed together</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {patterns.habitCorrelations.map((correlation, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 rounded-lg bg-cyan-50 border border-cyan-200"
                    >
                      <Badge variant="outline">{correlation.habit1}</Badge>
                      <span className="text-cyan-600">+</span>
                      <Badge variant="outline">{correlation.habit2}</Badge>
                      <span className="text-xs text-cyan-600 ml-1">
                        {Math.round(correlation.correlation * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
