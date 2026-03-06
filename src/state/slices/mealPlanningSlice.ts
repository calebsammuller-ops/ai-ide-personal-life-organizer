import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { MealPlan, Ingredient } from '@/types'
import type { RootState } from '../store'

interface ShoppingListItem extends Ingredient {
  checked: boolean
}

interface MealPlanningState {
  mealPlans: Record<string, MealPlan[]>
  favorites: MealPlan[]
  shoppingList: ShoppingListItem[]
  isLoading: boolean
  error: string | null
  selectedWeek: { start: string; end: string }
  selectedMeal: MealPlan | null
}

const getWeekDates = () => {
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - now.getDay())
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

const initialState: MealPlanningState = {
  mealPlans: {},
  favorites: [],
  shoppingList: [],
  isLoading: false,
  error: null,
  selectedWeek: getWeekDates(),
  selectedMeal: null,
}

export const fetchWeekMeals = createAsyncThunk(
  'mealPlanning/fetchWeekMeals',
  async (weekStart: string) => {
    const response = await fetch(`/api/meal-planning?weekStart=${weekStart}`)
    if (!response.ok) throw new Error('Failed to fetch meals')
    const data = await response.json()
    return data.data as MealPlan[]
  }
)

export const createMealPlan = createAsyncThunk(
  'mealPlanning/createMealPlan',
  async (meal: Partial<MealPlan>) => {
    const response = await fetch('/api/meal-planning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meal),
    })
    if (!response.ok) throw new Error('Failed to create meal plan')
    const data = await response.json()
    return data.data as MealPlan
  }
)

export const updateMealPlan = createAsyncThunk(
  'mealPlanning/updateMealPlan',
  async ({ id, updates }: { id: string; updates: Partial<MealPlan> }) => {
    const response = await fetch(`/api/meal-planning/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error('Failed to update meal plan')
    const data = await response.json()
    return data.data as MealPlan
  }
)

export const deleteMealPlan = createAsyncThunk(
  'mealPlanning/deleteMealPlan',
  async (id: string) => {
    const response = await fetch(`/api/meal-planning/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete meal plan')
    return id
  }
)

export const fetchShoppingList = createAsyncThunk(
  'mealPlanning/fetchShoppingList',
  async (weekStart: string) => {
    const response = await fetch(`/api/meal-planning/shopping-list?weekStart=${weekStart}`)
    if (!response.ok) throw new Error('Failed to fetch shopping list')
    const data = await response.json()
    return data.data as ShoppingListItem[]
  }
)

export const mealPlanningSlice = createSlice({
  name: 'mealPlanning',
  initialState,
  reducers: {
    setSelectedWeek: (state, action: PayloadAction<{ start: string; end: string }>) => {
      state.selectedWeek = action.payload
    },
    setSelectedMeal: (state, action: PayloadAction<MealPlan | null>) => {
      state.selectedMeal = action.payload
    },
    toggleShoppingItem: (state, action: PayloadAction<number>) => {
      if (state.shoppingList[action.payload]) {
        state.shoppingList[action.payload].checked = !state.shoppingList[action.payload].checked
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWeekMeals.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchWeekMeals.fulfilled, (state, action) => {
        state.isLoading = false
        const meals = action.payload
        state.mealPlans = {}
        meals.forEach((meal) => {
          if (!state.mealPlans[meal.date]) {
            state.mealPlans[meal.date] = []
          }
          state.mealPlans[meal.date].push(meal)
        })
      })
      .addCase(fetchWeekMeals.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message ?? 'Failed to fetch meals'
      })
      .addCase(createMealPlan.fulfilled, (state, action) => {
        const meal = action.payload
        if (!state.mealPlans[meal.date]) {
          state.mealPlans[meal.date] = []
        }
        state.mealPlans[meal.date].push(meal)
      })
      .addCase(updateMealPlan.fulfilled, (state, action) => {
        const meal = action.payload
        if (state.mealPlans[meal.date]) {
          const index = state.mealPlans[meal.date].findIndex((m) => m.id === meal.id)
          if (index !== -1) {
            state.mealPlans[meal.date][index] = meal
          }
        }
      })
      .addCase(deleteMealPlan.fulfilled, (state, action) => {
        Object.keys(state.mealPlans).forEach((date) => {
          state.mealPlans[date] = state.mealPlans[date].filter(
            (m) => m.id !== action.payload
          )
        })
      })
      .addCase(fetchShoppingList.fulfilled, (state, action) => {
        state.shoppingList = action.payload
      })
  },
})

export const { setSelectedWeek, setSelectedMeal, toggleShoppingItem } = mealPlanningSlice.actions

export const selectMealsByDate = (date: string) => (state: RootState) =>
  state.mealPlanning.mealPlans[date] ?? []
export const selectAllMealPlans = (state: RootState) => state.mealPlanning.mealPlans
export const selectShoppingList = (state: RootState) => state.mealPlanning.shoppingList
export const selectSelectedMeal = (state: RootState) => state.mealPlanning.selectedMeal
export const selectSelectedWeek = (state: RootState) => state.mealPlanning.selectedWeek
export const selectMealPlanningLoading = (state: RootState) => state.mealPlanning.isLoading

export default mealPlanningSlice.reducer
