import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../store'
import type { UserSubscriptionWithFeatures, SubscriptionTier } from '@/types/subscription'

interface SubscriptionState {
  data: UserSubscriptionWithFeatures | null
  isLoading: boolean
  error: string | null
  showUpgradePrompt: boolean
  upgradePromptReason: string | null
}

const initialState: SubscriptionState = {
  data: null,
  isLoading: false,
  error: null,
  showUpgradePrompt: false,
  upgradePromptReason: null,
}

export const fetchSubscription = createAsyncThunk(
  'subscription/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/subscription')
      if (!response.ok) {
        throw new Error('Failed to fetch subscription')
      }
      return await response.json()
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch subscription')
    }
  }
)

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    showUpgradePrompt: (state, action: PayloadAction<string>) => {
      state.showUpgradePrompt = true
      state.upgradePromptReason = action.payload
    },
    hideUpgradePrompt: (state) => {
      state.showUpgradePrompt = false
      state.upgradePromptReason = null
    },
    updateUsage: (state, action: PayloadAction<{ type: 'ai_message' | 'web_search'; increment: number }>) => {
      if (!state.data) return

      const { type, increment } = action.payload
      if (type === 'ai_message') {
        state.data.usage.aiMessagesUsed += increment
        if (state.data.usage.aiMessagesLimit !== -1) {
          state.data.usage.aiMessagesRemaining = Math.max(
            0,
            state.data.usage.aiMessagesLimit - state.data.usage.aiMessagesUsed
          )
        }
      } else if (type === 'web_search') {
        state.data.usage.webSearchesUsed += increment
        if (state.data.usage.webSearchesLimit !== -1) {
          state.data.usage.webSearchesRemaining = Math.max(
            0,
            state.data.usage.webSearchesLimit - state.data.usage.webSearchesUsed
          )
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubscription.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchSubscription.fulfilled, (state, action) => {
        state.isLoading = false
        state.data = action.payload
      })
      .addCase(fetchSubscription.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { showUpgradePrompt, hideUpgradePrompt, updateUsage } = subscriptionSlice.actions

// Selectors
export const selectSubscription = (state: RootState) => state.subscription.data
export const selectSubscriptionLoading = (state: RootState) => state.subscription.isLoading
export const selectSubscriptionError = (state: RootState) => state.subscription.error
export const selectShowUpgradePrompt = (state: RootState) => state.subscription.showUpgradePrompt
export const selectUpgradePromptReason = (state: RootState) => state.subscription.upgradePromptReason

export const selectCurrentTier = (state: RootState): SubscriptionTier =>
  state.subscription.data?.features.tier || 'free'

export const selectCanUseWebSearch = (state: RootState): boolean => {
  const data = state.subscription.data
  if (!data) return false
  if (!data.features.webSearchEnabled) return false
  if (data.features.webSearchesPerMonth === -1) return true
  return data.usage.webSearchesUsed < data.features.webSearchesPerMonth
}

export const selectCanSendAiMessage = (state: RootState): boolean => {
  const data = state.subscription.data
  if (!data) return true // Allow if not loaded yet
  if (data.features.aiMessagesPerMonth === -1) return true
  return data.usage.aiMessagesUsed < data.features.aiMessagesPerMonth
}

export const selectAiMessagesRemaining = (state: RootState): number => {
  const data = state.subscription.data
  if (!data) return 50 // Default free tier
  if (data.features.aiMessagesPerMonth === -1) return Infinity
  return data.usage.aiMessagesRemaining
}

export const selectWebSearchesRemaining = (state: RootState): number => {
  const data = state.subscription.data
  if (!data) return 0
  if (!data.features.webSearchEnabled) return 0
  if (data.features.webSearchesPerMonth === -1) return Infinity
  return data.usage.webSearchesRemaining
}

export default subscriptionSlice.reducer
