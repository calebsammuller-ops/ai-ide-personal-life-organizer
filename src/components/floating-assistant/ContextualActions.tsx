'use client'

import { Calendar, ListTodo, CheckSquare, Timer, FileText, Calculator, UtensilsCrossed, Lightbulb, Home, Zap, Brain, BarChart3, type LucideIcon } from 'lucide-react'

export interface ContextAction {
  label: string
  message: string
  icon: LucideIcon
}

const pageActions: Record<string, ContextAction[]> = {
  '/dashboard': [
    { label: 'Morning brief', message: 'Give me my morning brief', icon: Home },
    { label: 'Plan my day', message: 'Plan my day for me', icon: Calendar },
    { label: "What's next?", message: 'What should I focus on next?', icon: ListTodo },
  ],
  '/calendar': [
    { label: 'Plan my day', message: 'Help me plan my day', icon: Calendar },
    { label: 'Find free time', message: 'When am I free today?', icon: Timer },
    { label: 'Add event', message: 'Schedule a new event', icon: Calendar },
  ],
  '/tasks': [
    { label: 'Prioritize', message: 'Help me prioritize my tasks', icon: ListTodo },
    { label: "What's next?", message: 'What task should I do next?', icon: ListTodo },
    { label: 'Add task', message: 'Create a new task', icon: ListTodo },
  ],
  '/habits': [
    { label: 'How am I doing?', message: 'How are my habits going?', icon: CheckSquare },
    { label: 'Mark done', message: 'Mark a habit as done', icon: CheckSquare },
    { label: 'My streaks', message: 'Show my current streaks', icon: BarChart3 },
  ],
  '/time-tracking': [
    { label: 'Start timer', message: 'Start a timer', icon: Timer },
    { label: 'Today total', message: 'How much time have I tracked today?', icon: Timer },
    { label: 'Weekly report', message: 'Show my time tracking report for this week', icon: BarChart3 },
  ],
  '/projects': [
    { label: 'New project', message: 'Create a new project', icon: ListTodo },
    { label: 'Project status', message: 'Give me an overview of my projects', icon: BarChart3 },
  ],
  '/docs': [
    { label: 'New doc', message: 'Create a new document', icon: FileText },
    { label: 'Find doc', message: 'Search my documents', icon: FileText },
  ],
  '/math': [
    { label: 'Solve problem', message: 'Help me solve a math problem', icon: Calculator },
    { label: 'Practice', message: 'Generate practice problems', icon: Calculator },
  ],
  '/meal-planning': [
    { label: 'Plan meals', message: 'Help me plan meals for today', icon: UtensilsCrossed },
    { label: 'Log food', message: 'Log what I just ate', icon: UtensilsCrossed },
  ],
  '/thought-organization': [
    { label: 'Capture thought', message: 'I have a thought to capture', icon: Lightbulb },
    { label: 'Process thoughts', message: 'Help me process my unorganized thoughts', icon: Lightbulb },
  ],
  '/automations': [
    { label: 'New automation', message: 'Help me create an automation rule', icon: Zap },
    { label: 'Active rules', message: 'Show me my active automation rules', icon: Zap },
  ],
  '/insights': [
    { label: 'Weekly review', message: 'Give me a weekly review of my productivity', icon: Brain },
    { label: 'Patterns', message: 'What patterns do you see in my behavior?', icon: Brain },
  ],
}

// Default actions when no page-specific ones exist
const defaultActions: ContextAction[] = [
  { label: 'Morning brief', message: 'Give me my morning brief', icon: Home },
  { label: 'Plan my day', message: 'Help me plan my day', icon: Calendar },
  { label: "What's next?", message: 'What should I focus on next?', icon: ListTodo },
]

export function getContextualActions(route: string): ContextAction[] {
  // Try exact match first, then prefix match
  if (pageActions[route]) return pageActions[route]
  for (const [key, actions] of Object.entries(pageActions)) {
    if (route.startsWith(key + '/')) return actions
  }
  return defaultActions
}
