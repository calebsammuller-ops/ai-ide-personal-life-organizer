import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { scheduleMealPlan } from '@/lib/scheduling/mealSchedulingIntegration'
import type { MealPlan } from '@/types'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const weekStart = searchParams.get('weekStart')

  if (!weekStart) {
    return NextResponse.json({ error: 'weekStart is required' }, { status: 400 })
  }

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', weekStart)
    .lte('date', weekEnd.toISOString().split('T')[0])
    .order('date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const { data, error } = await supabase
    .from('meal_plans')
    .insert({
      user_id: user.id,
      date: body.date,
      meal_type: body.mealType,
      name: body.name,
      description: body.description,
      recipe_url: body.recipeUrl,
      calories: body.calories,
      prep_time_minutes: body.prepTimeMinutes,
      cook_time_minutes: body.cookTimeMinutes,
      servings: body.servings || 1,
      ingredients: body.ingredients || [],
      instructions: body.instructions || [],
      nutritional_info: body.nutritionalInfo || {},
      tags: body.tags || [],
      // Scheduling fields
      auto_schedule_prep: body.autoSchedulePrep ?? false,
      auto_schedule_meal: body.autoScheduleMeal ?? false,
      meal_time: body.mealTime ?? null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If auto-scheduling is enabled, create tasks for prep and/or meal time
  if (body.autoSchedulePrep || body.autoScheduleMeal) {
    const mealPlan: MealPlan = {
      id: data.id,
      userId: user.id,
      date: data.date,
      mealType: data.meal_type,
      name: data.name,
      description: data.description,
      recipeUrl: data.recipe_url,
      calories: data.calories,
      prepTimeMinutes: data.prep_time_minutes,
      cookTimeMinutes: data.cook_time_minutes,
      servings: data.servings,
      ingredients: data.ingredients || [],
      instructions: data.instructions || [],
      nutritionalInfo: data.nutritional_info || {},
      imageUrl: data.image_url,
      tags: data.tags || [],
      isFavorite: data.is_favorite,
      autoSchedulePrep: body.autoSchedulePrep,
      autoScheduleMeal: body.autoScheduleMeal,
      mealTime: body.mealTime,
    }

    await scheduleMealPlan({
      mealPlan,
      userId: user.id,
      supabase,
    })
  }

  return NextResponse.json({ data })
}
