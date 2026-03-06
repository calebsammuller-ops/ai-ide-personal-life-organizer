import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import calendarReducer from './slices/calendarSlice'
import habitsReducer from './slices/habitsSlice'
import mealPlanningReducer from './slices/mealPlanningSlice'
import thoughtsReducer from './slices/thoughtsSlice'
import assistantReducer from './slices/assistantSlice'
import preferencesReducer from './slices/preferencesSlice'
import dailyPlanReducer from './slices/dailyPlanSlice'
import uiReducer from './slices/uiSlice'
import tasksReducer from './slices/tasksSlice'
import focusBlocksReducer from './slices/focusBlocksSlice'
import gamificationReducer from './slices/gamificationSlice'
import subscriptionReducer from './slices/subscriptionSlice'
import consentReducer from './slices/consentSlice'
import projectsReducer from './slices/projectsSlice'
import timeTrackingReducer from './slices/timeTrackingSlice'
import documentsReducer from './slices/documentsSlice'
import searchReducer from './slices/searchSlice'
import automationsReducer from './slices/automationsSlice'
import dashboardReducer from './slices/dashboardSlice'
import mathReducer from './slices/mathSlice'
import knowledgeReducer from './slices/knowledgeSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    calendar: calendarReducer,
    habits: habitsReducer,
    mealPlanning: mealPlanningReducer,
    thoughts: thoughtsReducer,
    assistant: assistantReducer,
    preferences: preferencesReducer,
    dailyPlan: dailyPlanReducer,
    ui: uiReducer,
    tasks: tasksReducer,
    focusBlocks: focusBlocksReducer,
    gamification: gamificationReducer,
    subscription: subscriptionReducer,
    consent: consentReducer,
    projects: projectsReducer,
    timeTracking: timeTrackingReducer,
    documents: documentsReducer,
    search: searchReducer,
    automations: automationsReducer,
    dashboard: dashboardReducer,
    math: mathReducer,
    knowledge: knowledgeReducer,
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
