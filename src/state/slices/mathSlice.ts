import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../store'
import type {
  MathProblem,
  MathSolution,
  MathStats,
  MathDifficulty,
  MathTopic,
} from '@/types/math'

interface PracticeSessionState {
  sessionId: string | null
  topic: string
  difficulty: MathDifficulty
  problems: GeneratedProblem[]
  currentIndex: number
  correctAnswers: number
  streak: number
  isActive: boolean
}

interface GeneratedProblem {
  problemText: string
  hint: string
  solution: MathSolution
  difficulty: MathDifficulty
  topics: string[]
  concepts: string[]
}

interface MathState {
  problems: MathProblem[]
  currentSolution: MathSolution | null
  practiceSession: PracticeSessionState
  stats: MathStats | null
  isLoading: boolean
  error: string | null
}

const initialState: MathState = {
  problems: [],
  currentSolution: null,
  practiceSession: {
    sessionId: null,
    topic: 'algebra',
    difficulty: 'medium',
    problems: [],
    currentIndex: 0,
    correctAnswers: 0,
    streak: 0,
    isActive: false,
  },
  stats: null,
  isLoading: false,
  error: null,
}

// Async thunks
export const solveProblem = createAsyncThunk(
  'math/solveProblem',
  async (payload: { image?: string; text?: string; subject?: string }) => {
    const response = await fetch('/api/math/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Failed to solve problem')
    }
    const data = await response.json()
    return data.data as MathSolution & { id?: string }
  }
)

export const generateProblems = createAsyncThunk(
  'math/generateProblems',
  async (payload: { topic: string; difficulty: MathDifficulty; count?: number; subject?: string }) => {
    const response = await fetch('/api/math/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Failed to generate problems')
    }
    const data = await response.json()
    return data.data as { sessionId: string; problems: GeneratedProblem[] }
  }
)

export const checkAnswer = createAsyncThunk(
  'math/checkAnswer',
  async (payload: {
    problemId?: string
    userAnswer: string
    isCorrect: boolean
    sessionId?: string
    timeTakenSeconds?: number
  }) => {
    const response = await fetch('/api/math/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Failed to check answer')
    }
    const data = await response.json()
    return data.data as { isCorrect: boolean; recorded: boolean }
  }
)

export const fetchStats = createAsyncThunk(
  'math/fetchStats',
  async () => {
    const response = await fetch('/api/math/stats')
    if (!response.ok) throw new Error('Failed to fetch math stats')
    const data = await response.json()
    return data.data as MathStats
  }
)

export const fetchHistory = createAsyncThunk(
  'math/fetchHistory',
  async () => {
    const response = await fetch('/api/math/history')
    if (!response.ok) throw new Error('Failed to fetch math history')
    const data = await response.json()
    return data.data as MathProblem[]
  }
)

export const mathSlice = createSlice({
  name: 'math',
  initialState,
  reducers: {
    clearCurrentSolution: (state) => {
      state.currentSolution = null
    },
    setPracticeTopic: (state, action: PayloadAction<string>) => {
      state.practiceSession.topic = action.payload
    },
    setPracticeDifficulty: (state, action: PayloadAction<MathDifficulty>) => {
      state.practiceSession.difficulty = action.payload
    },
    nextProblem: (state) => {
      if (state.practiceSession.currentIndex < state.practiceSession.problems.length - 1) {
        state.practiceSession.currentIndex += 1
      }
    },
    resetPracticeSession: (state) => {
      state.practiceSession = {
        ...initialState.practiceSession,
        topic: state.practiceSession.topic,
        difficulty: state.practiceSession.difficulty,
      }
    },
    incrementStreak: (state) => {
      state.practiceSession.streak += 1
    },
    resetStreak: (state) => {
      state.practiceSession.streak = 0
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Solve problem
      .addCase(solveProblem.pending, (state) => {
        state.isLoading = true
        state.error = null
        state.currentSolution = null
      })
      .addCase(solveProblem.fulfilled, (state, action) => {
        state.isLoading = false
        state.currentSolution = action.payload
      })
      .addCase(solveProblem.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message ?? 'Failed to solve problem'
      })
      // Generate problems
      .addCase(generateProblems.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(generateProblems.fulfilled, (state, action) => {
        state.isLoading = false
        state.practiceSession.sessionId = action.payload.sessionId
        state.practiceSession.problems = action.payload.problems
        state.practiceSession.currentIndex = 0
        state.practiceSession.correctAnswers = 0
        state.practiceSession.streak = 0
        state.practiceSession.isActive = true
      })
      .addCase(generateProblems.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message ?? 'Failed to generate problems'
      })
      // Check answer
      .addCase(checkAnswer.fulfilled, (state, action) => {
        if (action.payload.isCorrect) {
          state.practiceSession.correctAnswers += 1
          state.practiceSession.streak += 1
        } else {
          state.practiceSession.streak = 0
        }
      })
      // Fetch stats
      .addCase(fetchStats.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.isLoading = false
        state.stats = action.payload
      })
      .addCase(fetchStats.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message ?? 'Failed to fetch stats'
      })
      // Fetch history
      .addCase(fetchHistory.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchHistory.fulfilled, (state, action) => {
        state.isLoading = false
        state.problems = action.payload
      })
      .addCase(fetchHistory.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message ?? 'Failed to fetch history'
      })
  },
})

export const {
  clearCurrentSolution,
  setPracticeTopic,
  setPracticeDifficulty,
  nextProblem,
  resetPracticeSession,
  incrementStreak,
  resetStreak,
  clearError,
} = mathSlice.actions

// Selectors
export const selectCurrentSolution = (state: RootState) => state.math.currentSolution
export const selectMathProblems = (state: RootState) => state.math.problems
export const selectPracticeSession = (state: RootState) => state.math.practiceSession
export const selectMathStats = (state: RootState) => state.math.stats
export const selectMathLoading = (state: RootState) => state.math.isLoading
export const selectMathError = (state: RootState) => state.math.error

export const selectCurrentPracticeProblem = (state: RootState) => {
  const session = state.math.practiceSession
  return session.problems[session.currentIndex] ?? null
}

export const selectPracticeProgress = (state: RootState) => {
  const session = state.math.practiceSession
  return {
    current: session.currentIndex + 1,
    total: session.problems.length,
    correct: session.correctAnswers,
    streak: session.streak,
  }
}

export default mathSlice.reducer
