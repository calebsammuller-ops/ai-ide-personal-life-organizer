import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { RootState } from '../store'

export interface AutomationRule {
  id: string
  userId: string
  name: string
  triggerType: string
  conditions: Record<string, unknown>
  actionType: string
  actionConfig: Record<string, unknown>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AutomationTemplate {
  id: string
  name: string
  description: string
  triggerType: string
  conditions: Record<string, unknown>
  actionType: string
  actionConfig: Record<string, unknown>
}

export interface CreateRuleInput {
  name: string
  triggerType: string
  conditions?: Record<string, unknown>
  actionType: string
  actionConfig?: Record<string, unknown>
  isActive?: boolean
}

export interface UpdateRuleInput {
  name?: string
  triggerType?: string
  conditions?: Record<string, unknown>
  actionType?: string
  actionConfig?: Record<string, unknown>
  isActive?: boolean
}

interface AutomationsState {
  rules: AutomationRule[]
  templates: AutomationTemplate[]
  isLoading: boolean
  error: string | null
}

const initialState: AutomationsState = {
  rules: [],
  templates: [],
  isLoading: false,
  error: null,
}

export const fetchRules = createAsyncThunk(
  'automations/fetchRules',
  async () => {
    const response = await fetch('/api/automations')
    if (!response.ok) throw new Error('Failed to fetch automation rules')
    const data = await response.json()
    return data.data as AutomationRule[]
  }
)

export const createRule = createAsyncThunk(
  'automations/createRule',
  async (rule: CreateRuleInput) => {
    const response = await fetch('/api/automations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    })
    if (!response.ok) throw new Error('Failed to create automation rule')
    const data = await response.json()
    return data.data as AutomationRule
  }
)

export const updateRule = createAsyncThunk(
  'automations/updateRule',
  async ({ id, updates }: { id: string; updates: UpdateRuleInput }) => {
    const response = await fetch(`/api/automations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error('Failed to update automation rule')
    const data = await response.json()
    return data.data as AutomationRule
  }
)

export const deleteRule = createAsyncThunk(
  'automations/deleteRule',
  async (id: string) => {
    const response = await fetch(`/api/automations/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete automation rule')
    return id
  }
)

export const fetchTemplates = createAsyncThunk(
  'automations/fetchTemplates',
  async () => {
    const response = await fetch('/api/automations/templates')
    if (!response.ok) throw new Error('Failed to fetch templates')
    const data = await response.json()
    return data.data as AutomationTemplate[]
  }
)

export const automationsSlice = createSlice({
  name: 'automations',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch rules
      .addCase(fetchRules.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchRules.fulfilled, (state, action) => {
        state.isLoading = false
        state.rules = action.payload
      })
      .addCase(fetchRules.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message ?? 'Failed to fetch rules'
      })
      // Create rule
      .addCase(createRule.fulfilled, (state, action) => {
        state.rules.unshift(action.payload)
      })
      // Update rule
      .addCase(updateRule.fulfilled, (state, action) => {
        const index = state.rules.findIndex(r => r.id === action.payload.id)
        if (index !== -1) {
          state.rules[index] = action.payload
        }
      })
      // Delete rule
      .addCase(deleteRule.fulfilled, (state, action) => {
        state.rules = state.rules.filter(r => r.id !== action.payload)
      })
      // Fetch templates
      .addCase(fetchTemplates.fulfilled, (state, action) => {
        state.templates = action.payload
      })
  },
})

// Selectors
export const selectAllRules = (state: RootState) => state.automations.rules
export const selectAutomationRules = (state: RootState) => state.automations.rules
export const selectAutomationTemplates = (state: RootState) => state.automations.templates
export const selectTemplates = (state: RootState) => state.automations.templates
export const selectAutomationsLoading = (state: RootState) => state.automations.isLoading
export const selectAutomationsError = (state: RootState) => state.automations.error
export const selectActiveRules = (state: RootState) =>
  state.automations.rules.filter(r => r.isActive)

export default automationsSlice.reducer
