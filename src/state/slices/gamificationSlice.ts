import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../store'
import type { GamificationStats, Achievement, XpEvent, UserLevel } from '@/types/gamification'
import { LEVELS, ACHIEVEMENTS, getLevelFromXp, getLevelProgress } from '@/types/gamification'

interface GamificationState {
  stats: GamificationStats | null
  recentXpEvents: XpEvent[]
  newAchievements: Achievement[]
  isLoading: boolean
  error: string | null
  showLevelUpModal: boolean
  levelUpData: { oldLevel: UserLevel; newLevel: UserLevel } | null
}

const initialState: GamificationState = {
  stats: null,
  recentXpEvents: [],
  newAchievements: [],
  isLoading: false,
  error: null,
  showLevelUpModal: false,
  levelUpData: null,
}

// Async thunks
export const fetchGamificationStats = createAsyncThunk(
  'gamification/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/gamification')
      if (!response.ok) {
        const error = await response.json()
        return rejectWithValue(error.error || 'Failed to fetch gamification stats')
      }
      const data = await response.json()
      return data.data as GamificationStats
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const awardXp = createAsyncThunk(
  'gamification/awardXp',
  async (payload: { amount: number; reason: string; category: XpEvent['category'] }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/gamification/xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const error = await response.json()
        return rejectWithValue(error.error || 'Failed to award XP')
      }
      const data = await response.json()
      return data.data as {
        xpEvent: XpEvent
        newTotalXp: number
        levelUp: boolean
        oldLevel?: UserLevel
        newLevel?: UserLevel
        newAchievements: Achievement[]
      }
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const checkAchievements = createAsyncThunk(
  'gamification/checkAchievements',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/gamification/achievements/check', {
        method: 'POST',
      })
      if (!response.ok) {
        const error = await response.json()
        return rejectWithValue(error.error || 'Failed to check achievements')
      }
      const data = await response.json()
      return data.data as { newAchievements: Achievement[] }
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const updateStreak = createAsyncThunk(
  'gamification/updateStreak',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/gamification/streak', {
        method: 'POST',
      })
      if (!response.ok) {
        const error = await response.json()
        return rejectWithValue(error.error || 'Failed to update streak')
      }
      const data = await response.json()
      return data.data as {
        currentStreak: number
        longestStreak: number
        streakBroken: boolean
        bonusXp?: number
      }
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

const gamificationSlice = createSlice({
  name: 'gamification',
  initialState,
  reducers: {
    clearNewAchievements: (state) => {
      state.newAchievements = []
    },
    dismissLevelUpModal: (state) => {
      state.showLevelUpModal = false
      state.levelUpData = null
    },
    addLocalXp: (state, action: PayloadAction<number>) => {
      if (state.stats) {
        const oldLevel = getLevelFromXp(state.stats.totalXp)
        state.stats.totalXp += action.payload
        state.stats.weeklyXpEarned += action.payload
        const newLevel = getLevelFromXp(state.stats.totalXp)
        state.stats.currentLevel = newLevel

        // Check for level up
        if (newLevel.level > oldLevel.level) {
          state.showLevelUpModal = true
          state.levelUpData = { oldLevel, newLevel }
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch stats
      .addCase(fetchGamificationStats.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchGamificationStats.fulfilled, (state, action) => {
        state.isLoading = false
        state.stats = action.payload
      })
      .addCase(fetchGamificationStats.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

      // Award XP
      .addCase(awardXp.fulfilled, (state, action) => {
        const { xpEvent, newTotalXp, levelUp, oldLevel, newLevel, newAchievements } = action.payload

        if (state.stats) {
          state.stats.totalXp = newTotalXp
          state.stats.weeklyXpEarned += xpEvent.amount
          state.stats.currentLevel = getLevelFromXp(newTotalXp)
        }

        state.recentXpEvents.unshift(xpEvent)
        if (state.recentXpEvents.length > 10) {
          state.recentXpEvents.pop()
        }

        if (levelUp && oldLevel && newLevel) {
          state.showLevelUpModal = true
          state.levelUpData = { oldLevel, newLevel }
        }

        if (newAchievements.length > 0) {
          state.newAchievements.push(...newAchievements)
          if (state.stats) {
            state.stats.unlockedAchievementIds.push(...newAchievements.map(a => a.id))
          }
        }
      })

      // Check achievements
      .addCase(checkAchievements.fulfilled, (state, action) => {
        const { newAchievements } = action.payload
        if (newAchievements.length > 0) {
          state.newAchievements.push(...newAchievements)
          if (state.stats) {
            state.stats.unlockedAchievementIds.push(...newAchievements.map(a => a.id))
          }
        }
      })

      // Update streak
      .addCase(updateStreak.fulfilled, (state, action) => {
        if (state.stats) {
          state.stats.currentDailyStreak = action.payload.currentStreak
          state.stats.longestDailyStreak = Math.max(
            state.stats.longestDailyStreak,
            action.payload.longestStreak
          )
        }
      })
  },
})

export const { clearNewAchievements, dismissLevelUpModal, addLocalXp } = gamificationSlice.actions

// Selectors
export const selectGamificationStats = (state: RootState) => state.gamification.stats
export const selectTotalXp = (state: RootState) => state.gamification.stats?.totalXp ?? 0
export const selectCurrentLevel = (state: RootState) =>
  state.gamification.stats?.currentLevel ?? LEVELS[0]
export const selectLevelProgress = (state: RootState) => {
  const xp = state.gamification.stats?.totalXp ?? 0
  return getLevelProgress(xp)
}
export const selectCurrentStreak = (state: RootState) =>
  state.gamification.stats?.currentDailyStreak ?? 0
export const selectLongestStreak = (state: RootState) =>
  state.gamification.stats?.longestDailyStreak ?? 0
export const selectUnlockedAchievements = (state: RootState) =>
  state.gamification.stats?.unlockedAchievementIds ?? []
export const selectNewAchievements = (state: RootState) => state.gamification.newAchievements
export const selectRecentXpEvents = (state: RootState) => state.gamification.recentXpEvents
export const selectShowLevelUpModal = (state: RootState) => state.gamification.showLevelUpModal
export const selectLevelUpData = (state: RootState) => state.gamification.levelUpData
export const selectGamificationLoading = (state: RootState) => state.gamification.isLoading

// Computed selectors
export const selectAllAchievements = (state: RootState) => {
  const unlockedIds = state.gamification.stats?.unlockedAchievementIds ?? []
  return ACHIEVEMENTS.map(achievement => ({
    ...achievement,
    unlockedAt: unlockedIds.includes(achievement.id) ? 'unlocked' : undefined,
  }))
}

export const selectWeeklyStats = (state: RootState) => {
  const stats = state.gamification.stats
  return {
    xpEarned: stats?.weeklyXpEarned ?? 0,
    tasksCompleted: stats?.weeklyTasksCompleted ?? 0,
    habitsCompleted: stats?.weeklyHabitsCompleted ?? 0,
    focusMinutes: stats?.weeklyFocusMinutes ?? 0,
  }
}

export default gamificationSlice.reducer
