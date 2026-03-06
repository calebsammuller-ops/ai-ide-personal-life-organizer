/**
 * Gamification Types
 * Achievement system, XP, levels, and streaks
 */

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: 'habits' | 'tasks' | 'focus' | 'streaks' | 'milestones' | 'special'
  xpReward: number
  requirement: AchievementRequirement
  unlockedAt?: string
  progress?: number // 0-100 for partial progress display
}

export interface AchievementRequirement {
  type: 'count' | 'streak' | 'milestone' | 'time' | 'special'
  target: number
  metric: string // e.g., 'habits_completed', 'tasks_completed', 'focus_minutes'
}

export interface UserLevel {
  level: number
  name: string
  minXp: number
  maxXp: number
  badge: string
}

export interface GamificationStats {
  userId: string
  totalXp: number
  currentLevel: UserLevel
  achievements: Achievement[]
  unlockedAchievementIds: string[]

  // Streaks
  currentDailyStreak: number
  longestDailyStreak: number
  lastActiveDate: string

  // Weekly stats
  weeklyXpEarned: number
  weeklyTasksCompleted: number
  weeklyHabitsCompleted: number
  weeklyFocusMinutes: number

  // Lifetime stats
  lifetimeTasksCompleted: number
  lifetimeHabitsCompleted: number
  lifetimeFocusMinutes: number
  lifetimeDaysActive: number
}

export interface XpEvent {
  id: string
  userId: string
  amount: number
  reason: string
  category: 'task' | 'habit' | 'focus' | 'achievement' | 'streak' | 'bonus'
  createdAt: string
}

// Predefined achievements
export const ACHIEVEMENTS: Omit<Achievement, 'unlockedAt' | 'progress'>[] = [
  // Habit achievements
  {
    id: 'first_habit',
    name: 'Building Blocks',
    description: 'Complete your first habit',
    icon: '🧱',
    category: 'habits',
    xpReward: 50,
    requirement: { type: 'count', target: 1, metric: 'habits_completed' },
  },
  {
    id: 'habit_10',
    name: 'Habit Former',
    description: 'Complete 10 habits',
    icon: '🌱',
    category: 'habits',
    xpReward: 100,
    requirement: { type: 'count', target: 10, metric: 'habits_completed' },
  },
  {
    id: 'habit_50',
    name: 'Consistency Champion',
    description: 'Complete 50 habits',
    icon: '🏆',
    category: 'habits',
    xpReward: 250,
    requirement: { type: 'count', target: 50, metric: 'habits_completed' },
  },
  {
    id: 'habit_100',
    name: 'Habit Master',
    description: 'Complete 100 habits',
    icon: '👑',
    category: 'habits',
    xpReward: 500,
    requirement: { type: 'count', target: 100, metric: 'habits_completed' },
  },

  // Task achievements
  {
    id: 'first_task',
    name: 'Getting Started',
    description: 'Complete your first task',
    icon: '✅',
    category: 'tasks',
    xpReward: 50,
    requirement: { type: 'count', target: 1, metric: 'tasks_completed' },
  },
  {
    id: 'task_25',
    name: 'Productive',
    description: 'Complete 25 tasks',
    icon: '📋',
    category: 'tasks',
    xpReward: 150,
    requirement: { type: 'count', target: 25, metric: 'tasks_completed' },
  },
  {
    id: 'task_100',
    name: 'Task Slayer',
    description: 'Complete 100 tasks',
    icon: '⚔️',
    category: 'tasks',
    xpReward: 400,
    requirement: { type: 'count', target: 100, metric: 'tasks_completed' },
  },
  {
    id: 'high_priority_10',
    name: 'Priority Handler',
    description: 'Complete 10 high-priority tasks',
    icon: '🔥',
    category: 'tasks',
    xpReward: 200,
    requirement: { type: 'count', target: 10, metric: 'high_priority_tasks' },
  },

  // Focus achievements
  {
    id: 'first_focus',
    name: 'Deep Diver',
    description: 'Complete your first focus session',
    icon: '🧘',
    category: 'focus',
    xpReward: 50,
    requirement: { type: 'count', target: 1, metric: 'focus_sessions' },
  },
  {
    id: 'focus_60',
    name: 'Hour of Power',
    description: 'Accumulate 60 minutes of focus time',
    icon: '⏱️',
    category: 'focus',
    xpReward: 100,
    requirement: { type: 'time', target: 60, metric: 'focus_minutes' },
  },
  {
    id: 'focus_600',
    name: 'Flow State',
    description: 'Accumulate 10 hours of focus time',
    icon: '🌊',
    category: 'focus',
    xpReward: 300,
    requirement: { type: 'time', target: 600, metric: 'focus_minutes' },
  },
  {
    id: 'focus_3000',
    name: 'Zen Master',
    description: 'Accumulate 50 hours of focus time',
    icon: '🏯',
    category: 'focus',
    xpReward: 750,
    requirement: { type: 'time', target: 3000, metric: 'focus_minutes' },
  },

  // Streak achievements
  {
    id: 'streak_3',
    name: 'Three-peat',
    description: 'Maintain a 3-day streak',
    icon: '3️⃣',
    category: 'streaks',
    xpReward: 75,
    requirement: { type: 'streak', target: 3, metric: 'daily_streak' },
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '📅',
    category: 'streaks',
    xpReward: 150,
    requirement: { type: 'streak', target: 7, metric: 'daily_streak' },
  },
  {
    id: 'streak_30',
    name: 'Monthly Marvel',
    description: 'Maintain a 30-day streak',
    icon: '🗓️',
    category: 'streaks',
    xpReward: 500,
    requirement: { type: 'streak', target: 30, metric: 'daily_streak' },
  },
  {
    id: 'streak_100',
    name: 'Century Club',
    description: 'Maintain a 100-day streak',
    icon: '💯',
    category: 'streaks',
    xpReward: 1000,
    requirement: { type: 'streak', target: 100, metric: 'daily_streak' },
  },

  // Milestones
  {
    id: 'level_5',
    name: 'Rising Star',
    description: 'Reach level 5',
    icon: '⭐',
    category: 'milestones',
    xpReward: 200,
    requirement: { type: 'milestone', target: 5, metric: 'level' },
  },
  {
    id: 'level_10',
    name: 'Double Digits',
    description: 'Reach level 10',
    icon: '🌟',
    category: 'milestones',
    xpReward: 400,
    requirement: { type: 'milestone', target: 10, metric: 'level' },
  },
  {
    id: 'xp_1000',
    name: 'XP Collector',
    description: 'Earn 1,000 total XP',
    icon: '💫',
    category: 'milestones',
    xpReward: 100,
    requirement: { type: 'milestone', target: 1000, metric: 'total_xp' },
  },
  {
    id: 'xp_10000',
    name: 'XP Hoarder',
    description: 'Earn 10,000 total XP',
    icon: '✨',
    category: 'milestones',
    xpReward: 500,
    requirement: { type: 'milestone', target: 10000, metric: 'total_xp' },
  },

  // Special achievements
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Complete a task before 7 AM',
    icon: '🐦',
    category: 'special',
    xpReward: 100,
    requirement: { type: 'special', target: 1, metric: 'early_completion' },
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Complete a task after 10 PM',
    icon: '🦉',
    category: 'special',
    xpReward: 100,
    requirement: { type: 'special', target: 1, metric: 'late_completion' },
  },
  {
    id: 'perfect_day',
    name: 'Perfect Day',
    description: 'Complete all scheduled tasks and habits in a day',
    icon: '💎',
    category: 'special',
    xpReward: 200,
    requirement: { type: 'special', target: 1, metric: 'perfect_day' },
  },
  {
    id: 'perfect_week',
    name: 'Perfect Week',
    description: 'Achieve 7 perfect days in a row',
    icon: '🏅',
    category: 'special',
    xpReward: 750,
    requirement: { type: 'special', target: 7, metric: 'perfect_week' },
  },
]

// Level definitions
export const LEVELS: UserLevel[] = [
  { level: 1, name: 'Beginner', minXp: 0, maxXp: 100, badge: '🌱' },
  { level: 2, name: 'Novice', minXp: 100, maxXp: 250, badge: '🌿' },
  { level: 3, name: 'Apprentice', minXp: 250, maxXp: 500, badge: '🌲' },
  { level: 4, name: 'Journeyman', minXp: 500, maxXp: 850, badge: '🌳' },
  { level: 5, name: 'Adept', minXp: 850, maxXp: 1300, badge: '⭐' },
  { level: 6, name: 'Expert', minXp: 1300, maxXp: 1850, badge: '🌟' },
  { level: 7, name: 'Master', minXp: 1850, maxXp: 2500, badge: '💫' },
  { level: 8, name: 'Grandmaster', minXp: 2500, maxXp: 3300, badge: '✨' },
  { level: 9, name: 'Champion', minXp: 3300, maxXp: 4250, badge: '🏆' },
  { level: 10, name: 'Legend', minXp: 4250, maxXp: 5350, badge: '👑' },
  { level: 11, name: 'Mythic', minXp: 5350, maxXp: 6600, badge: '🔮' },
  { level: 12, name: 'Transcendent', minXp: 6600, maxXp: 8000, badge: '🌌' },
  { level: 13, name: 'Eternal', minXp: 8000, maxXp: 9600, badge: '♾️' },
  { level: 14, name: 'Divine', minXp: 9600, maxXp: 11400, badge: '🌈' },
  { level: 15, name: 'Omniscient', minXp: 11400, maxXp: Infinity, badge: '🎇' },
]

// XP rewards for actions
export const XP_REWARDS = {
  completeTask: 15,
  completeHighPriorityTask: 25,
  completeHabit: 20,
  completeFocusSession: 30,
  perfectDay: 50,
  streakBonus: 10, // Per day of streak
  earlyCompletion: 5, // Bonus for completing before deadline
}

// Helper function to get level from XP
export function getLevelFromXp(xp: number): UserLevel {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) {
      return LEVELS[i]
    }
  }
  return LEVELS[0]
}

// Helper function to get XP progress within current level
export function getLevelProgress(xp: number): { current: number; needed: number; percentage: number } {
  const level = getLevelFromXp(xp)
  const current = xp - level.minXp
  const needed = level.maxXp - level.minXp
  const percentage = Math.min(100, Math.round((current / needed) * 100))
  return { current, needed, percentage }
}
