'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, UtensilsCrossed, ShoppingCart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageContainer } from '@/components/layout/PageContainer'
import { FAB } from '@/components/common/FAB'
import { EmptyState } from '@/components/common/EmptyState'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  selectAllMealPlans,
  selectSelectedWeek,
  setSelectedWeek,
  fetchWeekMeals,
} from '@/state/slices/mealPlanningSlice'
import { openModal } from '@/state/slices/uiSlice'
import { cn } from '@/lib/utils'
import { useRegisterPageContext } from '@/hooks/useRegisterPageContext'

const mealTypeOrder = ['breakfast', 'lunch', 'dinner', 'snack']
const mealTypeLabels: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

export default function MealPlanningPage() {
  const dispatch = useAppDispatch()
  const mealPlans = useAppSelector(selectAllMealPlans)
  const selectedWeek = useAppSelector(selectSelectedWeek)
  const [weekDates, setWeekDates] = useState<Date[]>([])

  useRegisterPageContext({
    pageTitle: 'Meal Planning',
    visibleContent: {
      type: 'meal_planning',
      weekStart: selectedWeek.start,
      weekEnd: selectedWeek.end,
      totalMealDays: Object.keys(mealPlans).length,
    },
  })

  useEffect(() => {
    dispatch(fetchWeekMeals(selectedWeek.start))
  }, [dispatch, selectedWeek])

  useEffect(() => {
    const start = new Date(selectedWeek.start)
    const dates: Date[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      dates.push(date)
    }
    setWeekDates(dates)
  }, [selectedWeek])

  const navigateWeek = (direction: 'prev' | 'next') => {
    const start = new Date(selectedWeek.start)
    const end = new Date(selectedWeek.end)
    const days = direction === 'prev' ? -7 : 7
    start.setDate(start.getDate() + days)
    end.setDate(end.getDate() + days)
    dispatch(setSelectedWeek({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    }))
  }

  const today = new Date().toISOString().split('T')[0]

  const getMealsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return (mealPlans[dateStr] || []).sort((a, b) =>
      mealTypeOrder.indexOf(a.mealType) - mealTypeOrder.indexOf(b.mealType)
    )
  }

  return (
    <PageContainer>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateWeek('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold min-w-[200px] text-center">
              {new Date(selectedWeek.start).toLocaleDateString('default', {
                month: 'short',
                day: 'numeric'
              })} - {new Date(selectedWeek.end).toLocaleDateString('default', {
                month: 'short',
                day: 'numeric'
              })}
            </h2>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateWeek('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" onClick={() => dispatch(openModal({ modalName: 'shoppingList' }))}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Shopping List
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-7">
          {weekDates.map((date) => {
            const dateStr = date.toISOString().split('T')[0]
            const isToday = dateStr === today
            const meals = getMealsForDate(date)

            return (
              <Card key={dateStr} className={cn(isToday && 'ring-2 ring-primary')}>
                <CardHeader className="pb-2 p-3">
                  <CardTitle className="text-sm">
                    <span className="block text-muted-foreground">
                      {date.toLocaleDateString('default', { weekday: 'short' })}
                    </span>
                    <span className={cn(
                      'text-lg',
                      isToday && 'text-primary font-bold'
                    )}>
                      {date.getDate()}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-2">
                  {meals.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No meals planned
                    </p>
                  ) : (
                    meals.map((meal) => (
                      <div
                        key={meal.id}
                        className="p-2 rounded bg-accent/50 cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => dispatch(openModal({ modalName: 'viewMeal', data: { meal } }))}
                      >
                        <Badge variant="outline" className="text-[10px] mb-1">
                          {mealTypeLabels[meal.mealType]}
                        </Badge>
                        <p className="text-sm font-medium truncate">{meal.name}</p>
                        {meal.calories && (
                          <p className="text-xs text-muted-foreground">
                            {meal.calories} cal
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card className="md:hidden">
          <CardHeader>
            <CardTitle>This Week&apos;s Meals</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(mealPlans).length === 0 ? (
              <EmptyState
                icon={UtensilsCrossed}
                title="No meals planned"
                description="Start planning your meals for the week"
                actionLabel="Add Meal"
                onAction={() => dispatch(openModal({ modalName: 'createMeal' }))}
              />
            ) : (
              <div className="space-y-4">
                {weekDates.map((date) => {
                  const meals = getMealsForDate(date)
                  if (meals.length === 0) return null

                  return (
                    <div key={date.toISOString()}>
                      <h4 className="font-medium mb-2">
                        {date.toLocaleDateString('default', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </h4>
                      <div className="space-y-2 pl-4 border-l-2 border-muted">
                        {meals.map((meal) => (
                          <div key={meal.id} className="flex items-center gap-3">
                            <Badge variant="outline">{mealTypeLabels[meal.mealType]}</Badge>
                            <span className="font-medium">{meal.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <FAB onClick={() => dispatch(openModal({ modalName: 'createMeal' }))} label="Add Meal" />
    </PageContainer>
  )
}
