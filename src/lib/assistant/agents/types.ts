/**
 * Sub-Agent Type Definitions
 *
 * Shared types for the Planner, Reflector (formerly Analyzer), Notifier, and Executor agents.
 * Architecture: Planner reasons strategically, Executor acts deterministically,
 * Reflector evaluates outcomes. These roles never collapse.
 */

export type AgentType = 'planner' | 'analyzer' | 'reflector' | 'notifier' | 'executor'

export interface AgentInput {
  userId: string
  message: string
  context: AgentContext
}

export interface AgentContext {
  todayEvents: { title: string; startTime: string; endTime: string }[]
  pendingTasks: { id: string; title: string; priority: number; deadline?: string; durationMinutes?: number }[]
  pendingHabits: { id: string; name: string }[]
  focusBlocks: { startTime: string; endTime: string; title: string }[]
  preferences: {
    wakeTime?: string
    workStartTime?: string
    workEndTime?: string
    sleepTime?: string
    lifeMode?: string
    autonomyLevel?: number
    truthMode?: string
    activePersona?: string
    growthPhase?: string
  }
  activitySummary: Record<string, number>
  burnoutSignals: string[]
}

export interface AgentOutput {
  agent: AgentType
  response: string
  actions?: AgentAction[]
  insights?: string[]
  confidence: number
  reflection?: ReflectionOutput
}

export interface AgentAction {
  type: string
  payload: Record<string, unknown>
  explanation: string
  requiresConfirmation: boolean
}

export interface ReflectionOutput {
  whatWorked: string[]
  whatFailed: string[]
  wrongAssumptions: string[]
  confidenceAdjustments: { memoryId: string; oldConfidence: number; newConfidence: number; reason: string }[]
  contradictionsDetected: { memoryA: string; memoryB: string; description: string }[]
}

export interface DecisionLogEntry {
  action: string
  reason: string
  agent: AgentType
  dataUsed: string[]
  confidence: number
  undoInstructions?: string
}
