export type NoteType = 'fleeting' | 'permanent' | 'concept' | 'experience' | 'project' | 'hub' | 'reference'
export type RelationshipType = 'supports' | 'contradicts' | 'extends' | 'applies_to' | 'derived_from' | 'related'
export type NoteSource = 'user' | 'AI' | 'external'

export interface KnowledgeNote {
  id: string
  zettelId?: string
  userId: string
  title: string
  type: NoteType
  content: string
  tags: string[]
  confidence: number
  importance: number
  source: NoteSource
  sourceUrl?: string
  isArchived: boolean
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface KnowledgeLink {
  id: string
  userId: string
  sourceNoteId: string
  targetNoteId: string
  relationship: RelationshipType
  strength: number
  createdAt: string
}

export interface CognitiveEvent {
  id: string
  userId: string
  eventType: 'note_created' | 'note_updated' | 'insight_generated' | 'idea_generated' | 'knowledge_gap_detected' | 'research_added' | 'link_created'
  relatedNoteIds: string[]
  description: string
  createdAt: string
}

export interface KnowledgeBriefing {
  briefing: string
  insights: { title: string; content: string }[]
  opportunities: { title: string; description: string }[]
  knowledgeGaps: { topic: string; reason: string }[]
  learningPath: string[]
}

export interface KnowledgeIdea {
  title: string
  description: string
  derivedFrom: string[]
  opportunity: string
}

export interface KnowledgeGap {
  topic: string
  reason: string
  relatedNotes: string[]
  suggestedLearning: string
}

export interface CreateNoteInput {
  title: string
  type?: NoteType
  content?: string
  tags?: string[]
  confidence?: number
  importance?: number
  source?: NoteSource
  sourceUrl?: string
}

export interface UpdateNoteInput {
  title?: string
  type?: NoteType
  content?: string
  tags?: string[]
  confidence?: number
  importance?: number
  isArchived?: boolean
}

export interface CreateLinkInput {
  sourceNoteId: string
  targetNoteId: string
  relationship?: RelationshipType
  strength?: number
}

export type PredictionType = 'missing_link' | 'knowledge_gap' | 'emerging_cluster' | 'idea_opportunity' | 'next_topic'

export interface KnowledgePrediction {
  id: string
  userId: string
  predictionType: PredictionType
  description: string
  relatedNoteIds: string[]
  confidence: number
  isDismissed: boolean
  createdAt: string
}

export interface ResearchMission {
  id: string
  userId: string
  topic: string
  description?: string
  status: 'active' | 'completed' | 'paused'
  sourcesProcessed: number
  notesGenerated: number
  createdAt: string
  updatedAt: string
}

export interface DuplicatePair {
  noteA: { id: string; title: string; zettelId?: string }
  noteB: { id: string; title: string; zettelId?: string }
  similarity: number
  recommendation: 'merge' | 'link'
}

export interface EvolveResult {
  insightsCreated: number
  linksCreated: number
  predictionsGenerated: number
  notesCompressed: number
}

export interface IdeaExpansion {
  title: string
  oneLiner: string
  market: string
  features: string[]
  businessModel: string
  competitors: string[]
  uniqueAdvantage: string
  nextSteps: string[]
  risks: string[]
  noteContent: string
}

export interface KnowledgeChatMessage {
  role: 'user' | 'assistant'
  content: string
  relatedNotes?: { id: string; title: string; zettelId?: string }[]
}

// ── Wave 2: Intelligence Features ──────────────────────────────────────────

// Cognitive Mirror
export interface CognitiveMirrorPattern {
  label: string
  description: string
  score: number
  valence: 'strength' | 'weakness' | 'neutral'
}
export interface CognitiveMirrorResult {
  patterns: CognitiveMirrorPattern[]
  dominantStyle: string
  observation: string
  strengthSummary: string
  blindSpot: string
  recommendation: string
  thinkingBiases: string[]
  learningStyle: string
  focusScore: number
}

// Strategy Engine
export interface StrategyStep {
  priority: number
  action: string
  rationale: string
  relatedNotes: string[]
  timeEstimate: string
  impactScore: number
  effortScore: number
  confidence: number
}
export interface StrategyResult {
  strategicFocus: string
  steps: StrategyStep[]
  momentumArea: string
  underexploredArea: string
  weeklyChallenge: string
}

// Life Trajectory
export interface TrendSeries {
  tag: string
  weeks: { week: string; count: number }[]
  momentum: number
}
export interface TrajectoryProjection {
  threeMonths: string
  twelveMonths: string
}
export interface TrajectoryNarrative {
  trajectory: string
  headline: string
  reasoning: string
  possibleFutures: string[]
  projection: TrajectoryProjection
}
export interface TrajectoryResult {
  trends: TrendSeries[]
  risingTags: string[]
  stableTags: string[]
  narrative: TrajectoryNarrative | null
}

// What If Simulation
export interface SimulatedOutcome {
  label: string
  probability: string
  description: string
  keyActions: string[]
  risks: string[]
  sourceNotes: string[]
}
export interface WhatIfSimulation {
  scenario: string
  outcomes: SimulatedOutcome[]
  recommendation: string
  notesToReview: string[]
}

// ── Wave 3: Decision Engine + Weekly Review ─────────────────────────────────

// Decision Engine
export interface DecisionOption {
  option: string
  pros: string[]
  cons: string[]
  riskLevel: 'low' | 'medium' | 'high'
  alignsWithNotes: string[]
}
export interface DecisionResult {
  question: string
  options: DecisionOption[]
  recommendation: string
  keyFactors: string[]
  blindSpots: string[]
  nextStep: string
}

// Weekly Review
export interface WeeklyReviewResult {
  period: string
  noteCount: number
  topThemes: string[]
  deepestInsight: string
  momentum: string
  notableConnections: string[]
  nextWeekFocus: string
  questionToSitWith: string
}

// Idea Collision Engine
export interface KnowledgeCollision {
  clusterA: { theme: string; notes: string[] }
  clusterB: { theme: string; notes: string[] }
  collision: {
    title: string
    concept: string
    applications: string[]
    techApproach: string
    firstStep: string
  }
}
