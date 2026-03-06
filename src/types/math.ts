// Math Solver Types (Gauth-inspired)

export interface SolutionStep {
  stepNumber: number
  description: string
  expression: string // LaTeX
  explanation: string
}

export interface MathSolution {
  steps: SolutionStep[]
  finalAnswer: string // LaTeX
  alternativeMethods?: { name: string; steps: SolutionStep[] }[]
  difficulty: MathDifficulty
  topics: string[]
  concepts: string[]
  explanation: string
}

export interface MathProblem {
  id: string
  userId: string
  imageUrl?: string
  problemText: string
  solution: MathSolution
  difficulty?: MathDifficulty
  topics: string[]
  source: 'photo' | 'typed' | 'generated'
  isCorrect?: boolean
  userAnswer?: string
  timeTakenSeconds?: number
  createdAt: string
}

export interface PracticeSession {
  id: string
  userId: string
  topic: string
  difficulty: string
  totalProblems: number
  correctAnswers: number
  avgTimeSeconds?: number
  startedAt: string
  completedAt?: string
}

export interface MathStats {
  totalProblemsSolved: number
  totalCorrect: number
  topicsMastered: string[]
  weakTopics: string[]
  currentStreak: number
  bestStreak: number
  topicScores: Record<string, { solved: number; correct: number }>
  lastPracticedAt?: string
}

export type MathDifficulty = 'easy' | 'medium' | 'hard' | 'advanced'

export type MathTopic =
  | 'arithmetic'
  | 'algebra'
  | 'geometry'
  | 'trigonometry'
  | 'calculus'
  | 'statistics'
  | 'linear_algebra'
  | 'number_theory'

export const MATH_TOPICS: { id: MathTopic; name: string; icon: string }[] = [
  { id: 'arithmetic', name: 'Arithmetic', icon: '🔢' },
  { id: 'algebra', name: 'Algebra', icon: '📐' },
  { id: 'geometry', name: 'Geometry', icon: '📏' },
  { id: 'trigonometry', name: 'Trigonometry', icon: '📊' },
  { id: 'calculus', name: 'Calculus', icon: '∫' },
  { id: 'statistics', name: 'Statistics', icon: '📈' },
  { id: 'linear_algebra', name: 'Linear Algebra', icon: '🔲' },
  { id: 'number_theory', name: 'Number Theory', icon: '🔣' },
]
