'use client'

import { useState, useEffect } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Flame,
  TrendingUp,
  History,
  Target,
  ChevronDown,
  ChevronUp,
  Loader2,
  ScanLine,
  Apple,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FoodItem, DietaryNote } from '@/types'

interface FoodScanData {
  id: string
  items: FoodItem[]
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  total_fiber: number
  meal_name: string | null
  health_score: number
  dietary_notes: DietaryNote[]
  created_at: string
}

interface AggregatedData {
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  totalFiber: number
  scans: FoodScanData[]
  scanCount: number
  averageHealthScore: number
  topFoods: string[]
  dailyAverages: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
}

const defaultGoals = {
  dailyCalories: 2000,
  dailyProtein: 50,
  dailyCarbs: 250,
  dailyFat: 65,
  dailyFiber: 25,
}

export default function FoodHistoryPage() {
  const [period, setPeriod] = useState<7 | 14 | 30>(7)
  const [data, setData] = useState<AggregatedData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedScan, setExpandedScan] = useState<string | null>(null)

  useEffect(() => {
    fetchFoodHistory()
  }, [period])

  const fetchFoodHistory = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/food-history?days=${period}`)
      if (response.ok) {
        const result = await response.json()
        setData(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch food history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-100'
    if (score >= 5) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getProgressPercent = (value: number, goal: number) => {
    return Math.min(100, Math.round((value / goal) * 100))
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <History className="h-6 w-6" />
              Food History
            </h2>
            <p className="text-muted-foreground">
              Track your nutrition and food scanning history
            </p>
          </div>
          <div className="flex gap-2">
            {([7, 14, 30] as const).map((days) => (
              <Button
                key={days}
                variant={period === days ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(days)}
              >
                {days}d
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.scanCount === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ScanLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No food scans yet</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Start scanning your meals to track nutrition and see your history here.
                Go to Meal Planning and use the &quot;Scan Food&quot; feature!
              </p>
              <Button variant="outline" asChild>
                <a href="/meal-planning">Go to Meal Planning</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ScanLine className="h-4 w-4 text-blue-500" />
                    Total Scans
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.scanCount}</div>
                  <p className="text-xs text-muted-foreground">
                    in the last {period} days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-500" />
                    Avg Health Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.averageHealthScore}/10</div>
                  <Progress
                    value={data.averageHealthScore * 10}
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    Daily Avg Calories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.dailyAverages.calories}</div>
                  <p className="text-xs text-muted-foreground">
                    {getProgressPercent(data.dailyAverages.calories, defaultGoals.dailyCalories)}% of {defaultGoals.dailyCalories} goal
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                    Daily Avg Protein
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.dailyAverages.protein}g</div>
                  <p className="text-xs text-muted-foreground">
                    {getProgressPercent(data.dailyAverages.protein, defaultGoals.dailyProtein)}% of {defaultGoals.dailyProtein}g goal
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Daily Averages Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Daily Nutrition Averages</CardTitle>
                <CardDescription>Your average daily intake over {period} days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Calories</span>
                      <span>{data.dailyAverages.calories} / {defaultGoals.dailyCalories}</span>
                    </div>
                    <Progress value={getProgressPercent(data.dailyAverages.calories, defaultGoals.dailyCalories)} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Protein</span>
                      <span>{data.dailyAverages.protein}g / {defaultGoals.dailyProtein}g</span>
                    </div>
                    <Progress value={getProgressPercent(data.dailyAverages.protein, defaultGoals.dailyProtein)} className="h-2 [&>div]:bg-blue-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Carbs</span>
                      <span>{data.dailyAverages.carbs}g / {defaultGoals.dailyCarbs}g</span>
                    </div>
                    <Progress value={getProgressPercent(data.dailyAverages.carbs, defaultGoals.dailyCarbs)} className="h-2 [&>div]:bg-yellow-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Fat</span>
                      <span>{data.dailyAverages.fat}g / {defaultGoals.dailyFat}g</span>
                    </div>
                    <Progress value={getProgressPercent(data.dailyAverages.fat, defaultGoals.dailyFat)} className="h-2 [&>div]:bg-orange-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Fiber</span>
                      <span>{data.dailyAverages.fiber}g / {defaultGoals.dailyFiber}g</span>
                    </div>
                    <Progress value={getProgressPercent(data.dailyAverages.fiber, defaultGoals.dailyFiber)} className="h-2 [&>div]:bg-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Foods */}
            {data.topFoods.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Apple className="h-4 w-4 text-red-500" />
                    Most Scanned Foods
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {data.topFoods.map((food, index) => (
                      <Badge key={food} variant="secondary" className="text-sm">
                        {index + 1}. {food}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Scans */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Scans</CardTitle>
                <CardDescription>Your food scanning history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.scans.map((scan) => (
                    <div
                      key={scan.id}
                      className="border rounded-lg overflow-hidden"
                    >
                      <button
                        className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedScan(expandedScan === scan.id ? null : scan.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Badge className={cn('font-bold', getHealthScoreColor(scan.health_score))}>
                            {scan.health_score}/10
                          </Badge>
                          <div className="text-left">
                            <p className="font-medium">
                              {scan.meal_name || 'Food Scan'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(scan.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium">
                            {scan.total_calories} cal
                          </span>
                          {expandedScan === scan.id ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {expandedScan === scan.id && (
                        <div className="px-4 pb-4 border-t bg-muted/30">
                          <div className="pt-4 space-y-4">
                            {/* Nutrition breakdown */}
                            <div className="grid grid-cols-4 gap-4 text-center">
                              <div>
                                <p className="text-lg font-bold text-blue-600">{scan.total_protein}g</p>
                                <p className="text-xs text-muted-foreground">Protein</p>
                              </div>
                              <div>
                                <p className="text-lg font-bold text-yellow-600">{scan.total_carbs}g</p>
                                <p className="text-xs text-muted-foreground">Carbs</p>
                              </div>
                              <div>
                                <p className="text-lg font-bold text-orange-600">{scan.total_fat}g</p>
                                <p className="text-xs text-muted-foreground">Fat</p>
                              </div>
                              <div>
                                <p className="text-lg font-bold text-green-600">{scan.total_fiber}g</p>
                                <p className="text-xs text-muted-foreground">Fiber</p>
                              </div>
                            </div>

                            {/* Food items */}
                            {scan.items && scan.items.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-2">Items:</p>
                                <div className="flex flex-wrap gap-2">
                                  {scan.items.map((item, idx) => (
                                    <Badge key={idx} variant="outline">
                                      {item.name} ({item.portion})
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Dietary notes */}
                            {scan.dietary_notes && scan.dietary_notes.length > 0 && (
                              <div className="space-y-1">
                                {scan.dietary_notes.map((note, idx) => (
                                  <p
                                    key={idx}
                                    className={cn(
                                      'text-sm',
                                      note.type === 'warning' && 'text-yellow-700',
                                      note.type === 'success' && 'text-green-700',
                                      note.type === 'info' && 'text-blue-700'
                                    )}
                                  >
                                    {note.type === 'warning' && '⚠️ '}
                                    {note.type === 'success' && '✓ '}
                                    {note.type === 'info' && 'ℹ️ '}
                                    {note.message}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageContainer>
  )
}
