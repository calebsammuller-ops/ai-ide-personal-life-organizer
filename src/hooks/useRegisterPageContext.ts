import { useEffect, useRef } from 'react'
import { useAIContext, type ContentSummary, type SelectedItem } from '@/providers/AIContextProvider'

interface PageContextRegistration {
  pageTitle: string
  activeView?: string
  visibleContent?: ContentSummary
  selectedItems?: SelectedItem[]
}

/**
 * Hook for dashboard pages to register their visible content with the AI Context Provider.
 *
 * The AI assistant uses this context to give more relevant, proactive responses.
 * Pages opt-in by calling this hook — the provider never scrapes the DOM.
 *
 * @example
 * useRegisterPageContext({
 *   pageTitle: 'Calendar',
 *   activeView: 'week',
 *   visibleContent: {
 *     type: 'calendar',
 *     eventCount: events.length,
 *     dateRange: 'Feb 10-16, 2026',
 *   },
 * })
 */
export function useRegisterPageContext(registration: PageContextRegistration) {
  const { registerPage } = useAIContext()
  const prevRef = useRef<string>('')

  useEffect(() => {
    // Only register if something actually changed (avoid infinite loops)
    const serialized = JSON.stringify(registration)
    if (serialized !== prevRef.current) {
      prevRef.current = serialized
      registerPage(registration)
    }
  }, [registration, registerPage])
}
