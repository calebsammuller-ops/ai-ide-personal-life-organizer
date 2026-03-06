import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../store'
import type { Project, CreateProjectInput, UpdateProjectInput } from '@/types/projects'

interface ProjectsState {
  projects: Project[]
  currentProjectId: string | null
  isLoading: boolean
  error: string | null
}

const initialState: ProjectsState = {
  projects: [],
  currentProjectId: null,
  isLoading: false,
  error: null,
}

// Async thunks
export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async () => {
    const response = await fetch('/api/projects')
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to fetch projects')
    }
    const data = await response.json()
    return (data.data ?? []) as Project[]
  }
)

export const createProject = createAsyncThunk(
  'projects/createProject',
  async (project: CreateProjectInput) => {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    })
    if (!response.ok) throw new Error('Failed to create project')
    const data = await response.json()
    return data.data as Project
  }
)

export const updateProject = createAsyncThunk(
  'projects/updateProject',
  async ({ id, updates }: { id: string; updates: UpdateProjectInput }) => {
    const response = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error('Failed to update project')
    const data = await response.json()
    return data.data as Project
  }
)

export const deleteProject = createAsyncThunk(
  'projects/deleteProject',
  async (id: string) => {
    const response = await fetch(`/api/projects/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete project')
    return id
  }
)

export const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setCurrentProjectId: (state, action: PayloadAction<string | null>) => {
      state.currentProjectId = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch projects
      .addCase(fetchProjects.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.isLoading = false
        state.projects = action.payload
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message ?? 'Failed to fetch projects'
      })
      // Create project
      .addCase(createProject.fulfilled, (state, action) => {
        state.projects.push(action.payload)
      })
      .addCase(createProject.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to create project'
      })
      // Update project
      .addCase(updateProject.fulfilled, (state, action) => {
        const index = state.projects.findIndex(p => p.id === action.payload.id)
        if (index !== -1) {
          state.projects[index] = action.payload
        }
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to update project'
      })
      // Delete project
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.projects = state.projects.filter(p => p.id !== action.payload)
        if (state.currentProjectId === action.payload) {
          state.currentProjectId = null
        }
      })
      .addCase(deleteProject.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to delete project'
      })
  },
})

export const { setCurrentProjectId } = projectsSlice.actions

// Selectors
export const selectProjects = (state: RootState) => state.projects.projects
export const selectCurrentProject = (state: RootState) => {
  if (!state.projects.currentProjectId) return null
  return state.projects.projects.find(p => p.id === state.projects.currentProjectId) ?? null
}
export const selectProjectById = (id: string) => (state: RootState) =>
  state.projects.projects.find(p => p.id === id) ?? null
export const selectProjectsLoading = (state: RootState) => state.projects.isLoading
export const selectProjectsError = (state: RootState) => state.projects.error

export default projectsSlice.reducer
