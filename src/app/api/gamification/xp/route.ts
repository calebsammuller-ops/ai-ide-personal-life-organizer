import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getLevelFromXp, ACHIEVEMENTS } from '@/types/gamification'
import type { XpEvent, Achievement } from '@/types/gamification'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = user.id

  let body: { amount: number; reason: string; category: XpEvent['category'] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (typeof body.amount !== 'number' || body.amount <= 0) {
    return NextResponse.json({ error: 'Invalid XP amount' }, { status: 400 })
  }

  // Get current stats
  const { data: stats, error: fetchError } = await (supabase
    .from('gamification_stats') as any)
    .select('*')
    .eq('user_id', userId)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const oldTotalXp = (stats?.total_xp as number) || 0
  const newTotalXp = oldTotalXp + body.amount
  const oldLevel = getLevelFromXp(oldTotalXp)
  const newLevel = getLevelFromXp(newTotalXp)
  const levelUp = newLevel.level > oldLevel.level

  // Check for newly unlocked achievements based on XP milestones
  const unlockedIds = (stats?.unlocked_achievement_ids as string[]) || []
  const newAchievements: Achievement[] = []

  for (const achievement of ACHIEVEMENTS) {
    if (!unlockedIds.includes(achievement.id)) {
      if (achievement.requirement.metric === 'total_xp' && newTotalXp >= achievement.requirement.target) {
        newAchievements.push({ ...achievement, unlockedAt: new Date().toISOString() })
        unlockedIds.push(achievement.id)
      } else if (achievement.requirement.metric === 'level' && newLevel.level >= achievement.requirement.target) {
        newAchievements.push({ ...achievement, unlockedAt: new Date().toISOString() })
        unlockedIds.push(achievement.id)
      }
    }
  }

  // Update stats
  const updateData: Record<string, unknown> = {
    total_xp: newTotalXp,
    weekly_xp_earned: ((stats?.weekly_xp_earned as number) || 0) + body.amount,
    unlocked_achievement_ids: unlockedIds,
    updated_at: new Date().toISOString(),
  }

  // Update category-specific stats
  if (body.category === 'task') {
    updateData.weekly_tasks_completed = ((stats?.weekly_tasks_completed as number) || 0) + 1
    updateData.lifetime_tasks_completed = ((stats?.lifetime_tasks_completed as number) || 0) + 1
  } else if (body.category === 'habit') {
    updateData.weekly_habits_completed = ((stats?.weekly_habits_completed as number) || 0) + 1
    updateData.lifetime_habits_completed = ((stats?.lifetime_habits_completed as number) || 0) + 1
  }

  if (stats) {
    const { error: updateError } = await (supabase
      .from('gamification_stats') as any)
      .update(updateData)
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error updating stats:', updateError)
      // Continue anyway - don't fail the request
    }
  } else {
    // Create new stats entry
    const { error: insertError } = await (supabase
      .from('gamification_stats') as any)
      .insert({
        user_id: userId,
        ...updateData,
        current_daily_streak: 1,
        longest_daily_streak: 1,
        last_active_date: new Date().toISOString().split('T')[0],
        lifetime_days_active: 1,
      })

    if (insertError) {
      console.error('Error creating stats:', insertError)
      // Continue anyway
    }
  }

  // Create XP event record (optional - for history)
  const xpEvent: XpEvent = {
    id: crypto.randomUUID(),
    userId,
    amount: body.amount,
    reason: body.reason,
    category: body.category,
    createdAt: new Date().toISOString(),
  }

  // Try to save XP event (non-blocking)
  supabase
    .from('xp_events')
    .insert({
      id: xpEvent.id,
      user_id: userId,
      amount: body.amount,
      reason: body.reason,
      category: body.category,
    })
    .then(() => {})
    .catch(() => {})

  return NextResponse.json({
    data: {
      xpEvent,
      newTotalXp,
      levelUp,
      oldLevel: levelUp ? oldLevel : undefined,
      newLevel: levelUp ? newLevel : undefined,
      newAchievements,
    },
  })
}
