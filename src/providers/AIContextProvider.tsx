'use client'

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'

// --- Types ---

export interface SelectedItem {
  id: string
  type: 'task' | 'event' | 'habit' | 'document' | 'project'
  title: string
}

export interface ContentSummary {
  type: string
  [key: string]: unknown
}

export interface AIViewContext {
  currentRoute: string
  pageTitle: string
  activeView?: string
  selectedItems: SelectedItem[]
  visibleContent: ContentSummary | null
  userIntent: string | null
  lastInteraction: {
    type: string
    target: string
    timestamp: number
  } | null
}

interface PageRegistration {
  pageTitle: string
  activeView?: string
  visibleContent?: ContentSummary
  selectedItems?: SelectedItem[]
}

interface AIContextValue {
  viewContext: AIViewContext
  registerPage: (registration: PageRegistration) => void
  recordInteraction: (type: string, target: string) => void
  setUserIntent: (intent: string | null) => void
  isContextAwarenessEnabled: boolean
}

// --- Route → Page Title mapping ---

const routeTitleMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/calendar': 'Calendar',
  '/tasks': 'Tasks',
  '/projects': 'Projects',
  '/habits': 'Habits',
  '/time-tracking': 'Time Tracking',
  '/docs': 'Documents',
  '/automations': 'Automations',
  '/math': 'Math Solver',
  '/meal-planning': 'Meal Planning',
  '/thought-organization': 'Thoughts',
  '/live-assistant': 'AI Assistant',
  '/ai-decisions': 'AI Decisions',
  '/progress': 'Progress',
  '/insights': 'Insights',
  '/settings': 'Settings',
  '/food-history': 'Food History',
}

function getPageTitle(pathname: string): string {
  // Exact match first
  if (routeTitleMap[pathname]) return routeTitleMap[pathname]
  // Prefix match for nested routes
  for (const [route, title] of Object.entries(routeTitleMap)) {
    if (pathname.startsWith(route + '/')) return title
  }
  return 'Unknown'
}

// --- Context ---

const AIContext = createContext<AIContextValue | null>(null)

// --- Provider ---

export function AIContextProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [pageRegistration, setPageRegistration] = useState<PageRegistration | null>(null)
  const [lastInteraction, setLastInteraction] = useState<AIViewContext['lastInteraction']>(null)
  const [userIntent, setUserIntent] = useState<string | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Check if context awareness is enabled (from localStorage)
  const [isContextAwarenessEnabled] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('ai-context-awareness') !== 'false'
  })

  // Clear page registration when route changes
  useEffect(() => {
    setPageRegistration(null)
    setUserIntent(null)
  }, [pathname])

  // Debounced page registration to avoid rapid re-renders
  const registerPage = useCallback((registration: PageRegistration) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPageRegistration(registration)
    }, 300)
  }, [])

  const recordInteraction = useCallback((type: string, target: string) => {
    setLastInteraction({ type, target, timestamp: Date.now() })
  }, [])

  // Build the full view context
  const viewContext: AIViewContext = {
    currentRoute: pathname,
    pageTitle: pageRegistration?.pageTitle || getPageTitle(pathname),
    activeView: pageRegistration?.activeView,
    selectedItems: pageRegistration?.selectedItems || [],
    visibleContent: isContextAwarenessEnabled ? (pageRegistration?.visibleContent || null) : null,
    userIntent,
    lastInteraction,
  }

  return (
    <AIContext.Provider value={{
      viewContext,
      registerPage,
      recordInteraction,
      setUserIntent,
      isContextAwarenessEnabled,
    }}>
      {children}
    </AIContext.Provider>
  )
}

// --- Hooks ---

export function useAIContext(): AIContextValue {
  const context = useContext(AIContext)
  if (!context) {
    throw new Error('useAIContext must be used within AIContextProvider')
  }
  return context
}

export function useAIViewContext(): AIViewContext {
  const { viewContext } = useAIContext()
  return viewContext
}

/**
 * Serialize the current view context for injection into AI prompts.
 * Returns a compact string summary — NOT the raw object.
 */
export function serializeViewContext(ctx: AIViewContext): string {
  const lines: string[] = []

  lines.push(`Page: ${ctx.pageTitle} (${ctx.currentRoute})`)

  if (ctx.activeView) {
    lines.push(`View: ${ctx.activeView}`)
  }

  if (ctx.visibleContent) {
    const { type, ...rest } = ctx.visibleContent
    lines.push(`Content type: ${type}`)
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined && value !== null) {
        const formatted = Array.isArray(value)
          ? `${value.length} items`
          : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value)
        lines.push(`  ${key}: ${formatted}`)
      }
    }
  }

  if (ctx.selectedItems.length > 0) {
    lines.push(`Selected: ${ctx.selectedItems.map(i => `${i.type}:"${i.title}"`).join(', ')}`)
  }

  if (ctx.lastInteraction) {
    const ago = Math.round((Date.now() - ctx.lastInteraction.timestamp) / 1000)
    if (ago < 60) {
      lines.push(`Recent action: ${ctx.lastInteraction.type} on ${ctx.lastInteraction.target} (${ago}s ago)`)
    }
  }

  return lines.join('\n')
}
