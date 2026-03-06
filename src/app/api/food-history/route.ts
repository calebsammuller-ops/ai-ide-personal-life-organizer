import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '7')

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await (supabase
    .from('food_scans') as any)
    .select('*')
    .eq('user_id', user.id)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false })

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Aggregate nutrition data
  const scans = (data || []) as any[]
  const aggregated = {
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    totalFiber: 0,
    scans: scans,
    scanCount: scans.length,
    averageHealthScore: 0,
    topFoods: [] as string[],
    dailyAverages: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
    },
  }

  const foodCounts: Record<string, number> = {}
  let totalHealthScore = 0

  for (const scan of scans) {
    aggregated.totalCalories += scan.total_calories || 0
    aggregated.totalProtein += scan.total_protein || 0
    aggregated.totalCarbs += scan.total_carbs || 0
    aggregated.totalFat += scan.total_fat || 0
    aggregated.totalFiber += scan.total_fiber || 0
    totalHealthScore += scan.health_score || 0

    for (const item of scan.items || []) {
      foodCounts[item.name] = (foodCounts[item.name] || 0) + 1
    }
  }

  if (scans.length > 0) {
    aggregated.averageHealthScore = Math.round(totalHealthScore / scans.length * 10) / 10
    aggregated.dailyAverages = {
      calories: Math.round(aggregated.totalCalories / days),
      protein: Math.round(aggregated.totalProtein / days),
      carbs: Math.round(aggregated.totalCarbs / days),
      fat: Math.round(aggregated.totalFat / days),
      fiber: Math.round(aggregated.totalFiber / days),
    }
  }

  aggregated.topFoods = Object.entries(foodCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name)

  return NextResponse.json({ data: aggregated })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const { data, error } = await (supabase
    .from('food_scans') as any)
    .insert({
      user_id: user.id,
      items: body.items,
      total_calories: body.totalCalories,
      total_protein: body.totalProtein,
      total_carbs: body.totalCarbs,
      total_fat: body.totalFat,
      total_fiber: body.totalFiber,
      meal_name: body.mealName,
      health_score: body.healthScore,
      dietary_notes: body.dietaryNotes,
    })
    .select()
    .single()

  if (error) {
    // Table might not exist yet - return success anyway
    if (error.code === '42P01') {
      return NextResponse.json({
        data: { id: 'temp', ...body },
        warning: 'Food history table not set up yet'
      })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
