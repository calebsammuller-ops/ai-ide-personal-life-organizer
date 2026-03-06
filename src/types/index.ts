export * from './database.types'
export * from './scheduling'
export * from './voice'
export * from './projects'
export * from './timeTracking'
export * from './taskExtended'

// Calendar types
export interface CalendarEvent {
  id: string
  calendarId: string
  userId: string
  title: string
  description?: string
  location?: string
  startTime: Date | string
  endTime: Date | string
  allDay: boolean
  recurrenceRule?: string
  status: 'confirmed' | 'tentative' | 'cancelled'
  priority: 1 | 2 | 3 | 4 | 5
  category?: string
  reminders: { minutes: number }[]
  isAutoScheduled: boolean
}

export interface Calendar {
  id: string
  userId: string
  name: string
  color: string
  isPrimary: boolean
  isVisible: boolean
}

// Habit types
export interface HabitPlan {
  summary: string
  whyItMatters: string
  atomicHabitsStrategy: {
    makeItObvious: {
      cue: string
      implementationIntention: string
      habitStacking: string
    }
    makeItAttractive: {
      temptationBundling: string
      motivation: string
    }
    makeItEasy: {
      twoMinuteRule: string
      environmentDesign: string
      reducesFriction: string
    }
    makeItSatisfying: {
      immediateReward: string
      habitTracking: string
    }
  }
  weeklyPlan: {
    day: string
    action: string
    time: string
  }[]
  potentialObstacles: string[]
  tipsForSuccess: string[]
  suggestedReminderTime: string
  generatedAt?: string
  lastModified?: string
}

export interface Habit {
  id: string
  userId: string
  name: string
  description?: string
  icon: string
  color: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom'
  frequencyConfig: Record<string, unknown>
  targetCount: number
  reminderTime?: string
  reminderEnabled: boolean
  startDate: string
  endDate?: string
  isActive: boolean
  category?: string
  plan?: HabitPlan
  // Scheduling integration
  durationMinutes?: number
  energyLevel?: 'low' | 'medium' | 'high'
  autoSchedule?: boolean
  preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening' | 'anytime'
  schedulingPriority?: number
  // Project link
  projectId?: string
}

export interface HabitCompletion {
  id: string
  habitId: string
  userId: string
  completedDate: string
  completedCount: number
  notes?: string
}

// Meal planning types
export interface MealPlan {
  id: string
  userId: string
  date: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  name: string
  description?: string
  recipeUrl?: string
  calories?: number
  prepTimeMinutes?: number
  cookTimeMinutes?: number
  servings: number
  ingredients: Ingredient[]
  instructions: string[]
  nutritionalInfo: NutritionalInfo
  imageUrl?: string
  tags: string[]
  isFavorite: boolean
  // Scheduling integration
  autoSchedulePrep?: boolean
  autoScheduleMeal?: boolean
  mealTime?: string
  prepScheduledTaskId?: string
  mealScheduledTaskId?: string
}

export interface Ingredient {
  name: string
  amount: number
  unit: string
  category?: string
}

export interface NutritionalInfo {
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
}

// Food scanning types
export interface FoodItem {
  name: string
  portion: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

export interface RecipeSuggestion {
  name: string
  description: string
  additionalIngredients: string[]
  estimatedTime: number
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface DietaryNote {
  type: 'warning' | 'info' | 'success'
  message: string
}

export interface FoodScan {
  id: string
  userId: string
  items: FoodItem[]
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  totalFiber: number
  mealName: string
  healthScore: number
  dietaryNotes: DietaryNote[]
  recipeSuggestions: RecipeSuggestion[]
  matchedDietaryGoals: string[]
  missingNutrients: string[]
  createdAt: string
}

export interface DietaryGoals {
  dailyCalories: number
  dailyProtein: number
  dailyCarbs: number
  dailyFat: number
  dailyFiber: number
}

// Thought types
export interface Thought {
  id: string
  userId: string
  rawContent: string
  processedContent?: string
  extractedTasks: ExtractedTask[]
  extractedEvents: ExtractedEvent[]
  priority: 1 | 2 | 3 | 4 | 5
  category?: 'idea' | 'task' | 'reminder' | 'note'
  tags: string[]
  sentiment?: 'positive' | 'neutral' | 'negative'
  isProcessed: boolean
  isArchived: boolean
  linkedCalendarEventId?: string
  linkedHabitId?: string
  createdAt: string
}

export interface ExtractedTask {
  content: string
  dueDate?: string
  priority?: number
}

export interface ExtractedEvent {
  title: string
  date?: string
  time?: string
}

// Assistant types
export interface AssistantMessage {
  id: string
  userId: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  context: Record<string, unknown>
  intent?: string
  entities: unknown[]
  actionTaken?: Record<string, unknown>
  feedback?: 'helpful' | 'not_helpful'
  createdAt: string
}

export interface Conversation {
  id: string
  title?: string
  lastMessageAt: string
  messageCount: number
}

// User preferences
export interface UserPreferences {
  id: string
  userId: string
  wakeTime: string
  sleepTime: string
  workStartTime: string
  workEndTime: string
  preferredMealTimes: {
    breakfast: string
    lunch: string
    dinner: string
  }
  notificationPreferences: {
    push: boolean
    email: boolean
    sms: boolean
  }
  theme: 'light' | 'dark' | 'system'
  language: string
  lifeMode: LifeMode
  autonomyLevel: AutonomyLevel
  truthMode: TruthMode
  activePersona: SystemPersona
  growthPhase: GrowthPhase
  learnedPatterns: LearnedPatterns
  autoScheduleEnabled?: boolean
  smartRescheduleEnabled?: boolean
  bufferBetweenTasks?: number
  peakProductivityHours?: string[]
}

// User memory system for personalization
export interface UserMemory {
  id: string
  category: 'personal' | 'preference' | 'routine' | 'goal' | 'lifestyle' | 'health' | 'work'
  content: string
  confidence: number
  source: 'explicit' | 'inferred'
  createdAt: string
  lastReferenced: string
  referenceCount: number
  relatedEntities?: string[]
  evidenceBasis?: string
  contradicts?: string[]
  lastVerified?: string
}

export interface ResponsePreferences {
  preferredResponseLength: 'short' | 'medium' | 'long'
  successfulIntents: string[]
  totalFeedbackCount: number
  helpfulRate: number
  analyzedAt: string
}

export interface ConversationPatterns {
  commonTopics: string[]
  frequentIntents: Record<string, number>
  peakUsageTimes: string[]
}

export interface LearnedPatterns {
  // Behavioral patterns
  mostProductiveHours?: string[]
  preferredEventDurations?: Record<string, number>
  habitSuccessDays?: string[]
  commonMealTypes?: string[]
  peakEnergyTimes?: string[]
  preferredWorkBlocks?: { start: string; end: string; avgDuration: number }[]
  habitCorrelations?: { habit1: string; habit2: string; correlation: number }[]
  optimalScheduleSuggestions?: string[]
  insights?: string[]
  analyzedAt?: string

  // Personalization data
  userMemories?: UserMemory[]
  responsePreferences?: ResponsePreferences
  conversationPatterns?: ConversationPatterns

  // Learned behaviors / skills — custom AI trigger-action pairs
  learnedBehaviors?: LearnedBehavior[]

  // Life Mode & Autonomy
  lifeMode?: LifeMode
  autonomyLevel?: AutonomyLevel
}

export interface LearnedBehavior {
  id: string
  trigger: string        // e.g. "grind session", "security sweep"
  action: string         // natural language description of what to do
  createdAt: string
  useCount: number
}

// Life Modes - adapt the AI behavior to the user's current state
export type LifeMode = 'deep_work' | 'recovery' | 'travel' | 'burnout' | 'focus_sprint' | 'low_energy' | 'normal'

export const LIFE_MODE_CONFIG: Record<LifeMode, {
  label: string
  description: string
  schedulingIntensity: 'minimal' | 'light' | 'moderate' | 'aggressive'
  notificationLevel: 'silent' | 'critical_only' | 'normal' | 'proactive'
  tone: 'gentle' | 'encouraging' | 'direct' | 'calm'
  icon: string
}> = {
  normal: {
    label: 'Normal',
    description: 'Standard scheduling and notifications',
    schedulingIntensity: 'moderate',
    notificationLevel: 'normal',
    tone: 'encouraging',
    icon: 'Sun',
  },
  deep_work: {
    label: 'Deep Work',
    description: 'Minimal interruptions, focus-optimized scheduling',
    schedulingIntensity: 'aggressive',
    notificationLevel: 'critical_only',
    tone: 'direct',
    icon: 'Brain',
  },
  recovery: {
    label: 'Recovery',
    description: 'Light scheduling, gentle reminders, no pressure',
    schedulingIntensity: 'minimal',
    notificationLevel: 'critical_only',
    tone: 'gentle',
    icon: 'Heart',
  },
  travel: {
    label: 'Travel',
    description: 'Flexible timing, location-aware, essentials only',
    schedulingIntensity: 'light',
    notificationLevel: 'critical_only',
    tone: 'calm',
    icon: 'Plane',
  },
  burnout: {
    label: 'Burnout Recovery',
    description: 'Reduced expectations, wellbeing focus, gradual rebuilding',
    schedulingIntensity: 'minimal',
    notificationLevel: 'silent',
    tone: 'gentle',
    icon: 'Shield',
  },
  focus_sprint: {
    label: 'Focus Sprint',
    description: 'Time-boxed intense productivity, clear boundaries',
    schedulingIntensity: 'aggressive',
    notificationLevel: 'silent',
    tone: 'direct',
    icon: 'Zap',
  },
  low_energy: {
    label: 'Low Energy',
    description: 'Prioritize essentials, defer non-critical tasks',
    schedulingIntensity: 'light',
    notificationLevel: 'critical_only',
    tone: 'gentle',
    icon: 'Battery',
  },
}

// Autonomy Levels - how much control the AI has
export type AutonomyLevel = 1 | 2 | 3 | 4

export const AUTONOMY_LEVEL_CONFIG: Record<AutonomyLevel, {
  label: string
  description: string
  aiCanDo: string[]
  requiresConfirmation: boolean
}> = {
  1: {
    label: 'Advisory Only',
    description: 'AI suggests, you decide everything',
    aiCanDo: ['Suggest actions', 'Analyze patterns', 'Answer questions'],
    requiresConfirmation: true,
  },
  2: {
    label: 'Suggest + Confirm',
    description: 'AI proposes changes, you approve before execution',
    aiCanDo: ['All Level 1', 'Propose schedule changes', 'Draft daily plans', 'Suggest habit adjustments'],
    requiresConfirmation: true,
  },
  3: {
    label: 'Auto-adjust with Logs',
    description: 'AI makes minor adjustments automatically, logs everything for review',
    aiCanDo: ['All Level 2', 'Reschedule non-critical tasks', 'Adjust habit reminders', 'Optimize buffer time'],
    requiresConfirmation: false,
  },
  4: {
    label: 'Fully Autonomous',
    description: 'AI manages your schedule proactively. All changes are reversible.',
    aiCanDo: ['All Level 3', 'Create events', 'Reorganize daily plan', 'Adjust priorities based on patterns'],
    requiresConfirmation: false,
  },
}

// Truth Mode — controls how directly the AI communicates
export type TruthMode = 'observational' | 'direct' | 'confrontational'

export const TRUTH_MODE_CONFIG: Record<TruthMode, {
  label: string
  description: string
  promptBehavior: string
}> = {
  observational: {
    label: 'Observational',
    description: 'Surfaces patterns and data. Lets you draw your own conclusions.',
    promptBehavior: 'Present observations and data without interpreting or prescribing. Let the user connect the dots. Use phrases like "I notice...", "The data shows...", "Over the past week..."',
  },
  direct: {
    label: 'Direct',
    description: 'States what the data means plainly. No sugarcoating, no hedging.',
    promptBehavior: 'State conclusions plainly based on evidence. No hedging, no softening. If a pattern is clear, name it. Use phrases like "This is...", "You are...", "The pattern here is..."',
  },
  confrontational: {
    label: 'Confrontational',
    description: 'Challenges rationalizations and avoidance directly. Requires opt-in.',
    promptBehavior: 'Challenge rationalizations, name avoidance patterns, and call out contradictions between stated goals and actual behavior. Be respectful but unflinching. Use phrases like "You said X but did Y", "This is avoidance", "The uncomfortable truth is..."',
  },
}

// Growth Path — tracks user maturity progression
export type GrowthPhase = 'novice' | 'builder' | 'strategist' | 'architect'

export const GROWTH_PHASE_CONFIG: Record<GrowthPhase, {
  label: string
  description: string
  criteria: string
  aiApproach: string
  icon: string
}> = {
  novice: {
    label: 'Novice',
    description: 'Building foundational habits and learning the system.',
    criteria: 'New user or < 7 days of consistent activity',
    aiApproach: 'Guide explicitly. Offer structure. Explain why, not just what. Celebrate first completions.',
    icon: 'Sprout',
  },
  builder: {
    label: 'Builder',
    description: 'Habits are forming. Starting to build systems.',
    criteria: '7+ days activity, 3+ active habits, some streaks forming',
    aiApproach: 'Reduce hand-holding. Focus on system optimization. Point out what is working and why.',
    icon: 'Hammer',
  },
  strategist: {
    label: 'Strategist',
    description: 'Systems are running. Thinking in terms of trade-offs and priorities.',
    criteria: '30+ days activity, 50%+ habit completion, uses planning features',
    aiApproach: 'Challenge assumptions. Surface trade-offs. Ask questions more than give answers. Respect autonomy.',
    icon: 'Target',
  },
  architect: {
    label: 'Architect',
    description: 'Designing life systems intentionally. Meta-awareness of patterns.',
    criteria: '90+ days activity, 70%+ habit completion, uses reflection and planning regularly',
    aiApproach: 'Peer-level dialogue. Offer frameworks, not instructions. Challenge at the systems level. Minimal intervention.',
    icon: 'Crown',
  },
}

// System Personas — communication modes the AI can adopt
export type SystemPersona = 'truthful' | 'strategic' | 'mentorship' | 'tactical'

export const SYSTEM_PERSONA_CONFIG: Record<SystemPersona, {
  label: string
  description: string
  promptBehavior: string
  icon: string
}> = {
  truthful: {
    label: 'Truthful',
    description: 'Pure honesty and evidence-based analysis. Default mode.',
    promptBehavior: 'Prioritize accuracy above all. State what the data shows. No softening, no encouragement unless earned. Every claim needs evidence.',
    icon: 'Scale',
  },
  strategic: {
    label: 'Strategic',
    description: 'Long-term thinking. Trade-offs, opportunity cost, systems design.',
    promptBehavior: 'Think in systems and second-order effects. Consider what the user is optimizing for vs what they should optimize for. Surface trade-offs explicitly. Frame decisions in terms of leverage and ROI.',
    icon: 'Crosshair',
  },
  mentorship: {
    label: 'Mentorship',
    description: 'Teaching mode. Explains reasoning, builds understanding.',
    promptBehavior: 'Explain the why behind recommendations. Use analogies and frameworks. Ask Socratic questions. Build the user\'s ability to think independently rather than creating dependency.',
    icon: 'GraduationCap',
  },
  tactical: {
    label: 'Tactical',
    description: 'Minimal words, maximum action. Execute-first mindset.',
    promptBehavior: 'Be extremely concise. Skip explanations unless asked. Bias toward immediate actionable output. If the user says "do X", do X with minimal commentary. Respond in bullets, not paragraphs.',
    icon: 'Zap',
  },
}

// Weekly Strategic Reflection
export interface WeeklyReflection {
  id: string
  userId: string
  weekStart: string
  weekEnd: string
  summary: {
    tasksCompleted: number
    tasksDeferred: number
    habitsCompletionRate: number
    eventsAttended: number
    eventsCancelled: number
    focusBlocksUsed: number
    topStreaks: { name: string; days: number }[]
  }
  insights: string[]
  contradictions: string[]
  systemRecommendations: string[]
  growthPhase: GrowthPhase
  createdAt: string
}

// Decision Journal - AI transparency
export interface AIDecisionEntry {
  id: string
  userId: string
  timestamp: string
  action: string
  reason: string
  dataUsed: string
  confidence: 'high' | 'medium' | 'low'
  undoInstructions: string
  wasReversed: boolean
}

// Daily plan
export interface DailyPlan {
  id: string
  userId: string
  date: string
  planData: TimeBlock[]
  generatedAt: string
  isLocked: boolean
  notes?: string
}

export interface TimeBlock {
  startTime: string
  endTime: string
  type: 'event' | 'habit' | 'meal' | 'free' | 'break' | 'task' | 'focus'
  title: string
  referenceId?: string
  color?: string
  // For task blocks
  taskId?: string
  priority?: number
  energyLevel?: 'low' | 'medium' | 'high'
  // For focus blocks
  focusBlockId?: string
  isProtected?: boolean
}
