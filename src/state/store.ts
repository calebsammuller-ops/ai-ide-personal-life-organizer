import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import assistantReducer from './slices/assistantSlice'
import preferencesReducer from './slices/preferencesSlice'
import uiReducer from './slices/uiSlice'
import subscriptionReducer from './slices/subscriptionSlice'
import consentReducer from './slices/consentSlice'
import searchReducer from './slices/searchSlice'
import knowledgeReducer from './slices/knowledgeSlice'
import intelligenceScoreReducer from './slices/intelligenceScoreSlice'
import cognitiveMirrorReducer from './slices/cognitiveMirrorSlice'
import strategyReducer from './slices/strategySlice'
import trajectoryReducer from './slices/trajectorySlice'
import weeklyReviewReducer from './slices/weeklyReviewSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    assistant: assistantReducer,
    preferences: preferencesReducer,
    ui: uiReducer,
    subscription: subscriptionReducer,
    consent: consentReducer,
    search: searchReducer,
    knowledge: knowledgeReducer,
    intelligenceScore: intelligenceScoreReducer,
    cognitiveMirror: cognitiveMirrorReducer,
    strategy: strategyReducer,
    trajectory: trajectoryReducer,
    weeklyReview: weeklyReviewReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
