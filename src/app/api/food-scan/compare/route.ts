import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface DietaryGoals {
  dailyCalories: number
  dailyProtein: number
  dailyCarbs: number
  dailyFat: number
  dailyFiber: number
}

const DEFAULT_GOALS: DietaryGoals = {
  dailyCalories: 2000,
  dailyProtein: 50,
  dailyCarbs: 250,
  dailyFat: 65,
  dailyFiber: 25,
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { scanResult } = body

  if (!scanResult) {
    return NextResponse.json({ error: 'scanResult is required' }, { status: 400 })
  }

  // Fetch user's dietary goals from preferences
  const { data: preferences } = await (supabase
    .from('user_preferences') as any)
    .select('dietary_goals')
    .eq('user_id', user.id)
    .single() as { data: { dietary_goals?: DietaryGoals } | null }

  const goals: DietaryGoals = preferences?.dietary_goals || DEFAULT_GOALS

  // Get today's consumed nutrition from food_scans
  const today = new Date().toISOString().split('T')[0]
  const { data: todayScans } = await (supabase
    .from('food_scans') as any)
    .select('total_calories, total_protein, total_carbs, total_fat, total_fiber')
    .eq('user_id', user.id)
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`) as { data: any[] | null }

  const consumed = {
    calories: (todayScans || []).reduce((sum: number, s: any) => sum + (s.total_calories || 0), 0),
    protein: (todayScans || []).reduce((sum: number, s: any) => sum + (s.total_protein || 0), 0),
    carbs: (todayScans || []).reduce((sum: number, s: any) => sum + (s.total_carbs || 0), 0),
    fat: (todayScans || []).reduce((sum: number, s: any) => sum + (s.total_fat || 0), 0),
    fiber: (todayScans || []).reduce((sum: number, s: any) => sum + (s.total_fiber || 0), 0),
  }

  // Calculate totals after this meal
  const afterMeal = {
    calories: consumed.calories + (scanResult.totalCalories || 0),
    protein: consumed.protein + (scanResult.totalProtein || 0),
    carbs: consumed.carbs + (scanResult.totalCarbs || 0),
    fat: consumed.fat + (scanResult.totalFat || 0),
    fiber: consumed.fiber + (scanResult.totalFiber || 0),
  }

  const comparison = {
    goals,
    consumed,
    afterMeal,
    percentages: {
      calories: Math.round((afterMeal.calories / goals.dailyCalories) * 100),
      protein: Math.round((afterMeal.protein / goals.dailyProtein) * 100),
      carbs: Math.round((afterMeal.carbs / goals.dailyCarbs) * 100),
      fat: Math.round((afterMeal.fat / goals.dailyFat) * 100),
      fiber: Math.round((afterMeal.fiber / goals.dailyFiber) * 100),
    },
    remaining: {
      calories: Math.max(0, goals.dailyCalories - afterMeal.calories),
      protein: Math.max(0, goals.dailyProtein - afterMeal.protein),
      carbs: Math.max(0, goals.dailyCarbs - afterMeal.carbs),
      fat: Math.max(0, goals.dailyFat - afterMeal.fat),
      fiber: Math.max(0, goals.dailyFiber - afterMeal.fiber),
    },
    warnings: [] as string[],
    recommendations: [] as string[],
  }

  // Generate warnings and recommendations
  const currentHour = new Date().getHours()

  if (comparison.percentages.calories > 100) {
    comparison.warnings.push(
      `This meal will exceed your daily calorie goal by ${comparison.percentages.calories - 100}%`
    )
  } else if (comparison.percentages.calories > 90) {
    comparison.warnings.push(
      'This meal will bring you close to your daily calorie limit'
    )
  }

  if (comparison.percentages.protein < 30 && currentHour > 12) {
    comparison.recommendations.push(
      'Consider adding more protein to reach your daily goal'
    )
  }

  if (comparison.percentages.fiber < 50 && currentHour > 14) {
    comparison.recommendations.push(
      'You may want to add fiber-rich foods to your remaining meals'
    )
  }

  if (comparison.percentages.fat > 100) {
    comparison.warnings.push(
      'This meal will exceed your daily fat goal'
    )
  }

  // Positive feedback
  if (comparison.percentages.protein >= 80 && comparison.percentages.protein <= 120) {
    comparison.recommendations.push(
      'Great protein intake today!'
    )
  }

  if (comparison.percentages.fiber >= 80) {
    comparison.recommendations.push(
      'Excellent fiber intake!'
    )
  }

  return NextResponse.json({ data: comparison })
}
