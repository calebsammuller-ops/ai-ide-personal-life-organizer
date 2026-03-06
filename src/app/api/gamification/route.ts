import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { GamificationStats } from '@/types/gamification'
import { LEVELS, ACHIEVEMENTS, getLevelFromXp } from '@/types/gamification'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = user.id

  // Try to get existing gamification stats
  const { data: existingStats, error: fetchError } = await (supabase
    .from('gamification_stats') as any)
    .select('*')
    .eq('user_id', userId)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') {
    // Error other than "not found"
    console.error('Error fetching gamification stats:', fetchError)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  // If no stats exist, create default stats
  if (!existingStats) {
    const defaultStats = {
      user_id: userId,
      total_xp: 0,
      current_daily_streak: 0,
      longest_daily_streak: 0,
      last_active_date: new Date().toISOString().split('T')[0],
      weekly_xp_earned: 0,
      weekly_tasks_completed: 0,
      weekly_habits_completed: 0,
      weekly_focus_minutes: 0,
      lifetime_tasks_completed: 0,
      lifetime_habits_completed: 0,
      lifetime_focus_minutes: 0,
      lifetime_days_active: 1,
      unlocked_achievement_ids: [],
    }

    const { data: newStats, error: insertError } = await (supabase
      .from('gamification_stats') as any)
      .insert(defaultStats)
      .select()
      .single()

    if (insertError) {
      // If table doesn't exist, return mock data for development
      const mockStats: GamificationStats = {
        userId,
        totalXp: 0,
        currentLevel: LEVELS[0],
        achievements: [],
        unlockedAchievementIds: [],
        currentDailyStreak: 0,
        longestDailyStreak: 0,
        lastActiveDate: new Date().toISOString().split('T')[0],
        weeklyXpEarned: 0,
        weeklyTasksCompleted: 0,
        weeklyHabitsCompleted: 0,
        weeklyFocusMinutes: 0,
        lifetimeTasksCompleted: 0,
        lifetimeHabitsCompleted: 0,
        lifetimeFocusMinutes: 0,
        lifetimeDaysActive: 1,
      }
      return NextResponse.json({ data: mockStats })
    }

    return NextResponse.json({ data: transformStats(newStats) })
  }

  return NextResponse.json({ data: transformStats(existingStats) })
}

function transformStats(dbStats: Record<string, unknown>): GamificationStats {
  const totalXp = (dbStats.total_xp as number) || 0
  const unlockedAchievementIds = (dbStats.unlocked_achievement_ids as string[]) || []

  return {
    userId: dbStats.user_id as string,
    totalXp,
    currentLevel: getLevelFromXp(totalXp),
    achievements: ACHIEVEMENTS.map(a => ({
      ...a,
      unlockedAt: unlockedAchievementIds.includes(a.id) ? dbStats.created_at as string : undefined,
    })),
    unlockedAchievementIds,
    currentDailyStreak: (dbStats.current_daily_streak as number) || 0,
    longestDailyStreak: (dbStats.longest_daily_streak as number) || 0,
    lastActiveDate: (dbStats.last_active_date as string) || new Date().toISOString().split('T')[0],
    weeklyXpEarned: (dbStats.weekly_xp_earned as number) || 0,
    weeklyTasksCompleted: (dbStats.weekly_tasks_completed as number) || 0,
    weeklyHabitsCompleted: (dbStats.weekly_habits_completed as number) || 0,
    weeklyFocusMinutes: (dbStats.weekly_focus_minutes as number) || 0,
    lifetimeTasksCompleted: (dbStats.lifetime_tasks_completed as number) || 0,
    lifetimeHabitsCompleted: (dbStats.lifetime_habits_completed as number) || 0,
    lifetimeFocusMinutes: (dbStats.lifetime_focus_minutes as number) || 0,
    lifetimeDaysActive: (dbStats.lifetime_days_active as number) || 1,
  }
}
