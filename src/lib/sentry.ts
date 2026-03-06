/**
 * Sentry configuration and utilities
 */

import * as Sentry from '@sentry/nextjs'

// Check if Sentry is configured
export const isSentryConfigured = !!process.env.NEXT_PUBLIC_SENTRY_DSN

/**
 * Initialize Sentry (called in instrumentation files)
 */
export function initSentry() {
  if (!isSentryConfigured) {
    console.warn('Sentry DSN not configured. Error tracking disabled.')
    return
  }

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Environment
    environment: process.env.NODE_ENV,

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Session Replay (optional)
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Release tracking
    release: process.env.NEXT_PUBLIC_APP_VERSION || 'development',

    // Ignore common non-actionable errors
    ignoreErrors: [
      // Network errors
      'Failed to fetch',
      'NetworkError',
      'Load failed',
      // User actions
      'AbortError',
      'ResizeObserver loop',
      // Browser extensions
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
    ],

    // Before sending, sanitize sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization']
        delete event.request.headers['cookie']
      }

      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.data) {
            // Remove potential secrets from data
            const sanitized = { ...breadcrumb.data }
            delete sanitized.password
            delete sanitized.token
            delete sanitized.apiKey
            breadcrumb.data = sanitized
          }
          return breadcrumb
        })
      }

      return event
    },
  })
}

/**
 * Capture exception with context
 */
export function captureError(
  error: Error | unknown,
  context?: {
    userId?: string
    route?: string
    action?: string
    extra?: Record<string, unknown>
  }
): string | undefined {
  if (!isSentryConfigured) {
    console.error('Error (Sentry not configured):', error)
    return undefined
  }

  return Sentry.captureException(error, {
    user: context?.userId ? { id: context.userId } : undefined,
    tags: {
      route: context?.route,
      action: context?.action,
    },
    extra: context?.extra,
  })
}

/**
 * Capture message with context
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>
): string | undefined {
  if (!isSentryConfigured) {
    console.log(`Message (Sentry not configured): ${message}`, context)
    return undefined
  }

  return Sentry.captureMessage(message, {
    level,
    extra: context,
  })
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string } | null): void {
  if (!isSentryConfigured) return
  Sentry.setUser(user)
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
): void {
  if (!isSentryConfigured) return

  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
    timestamp: Date.now() / 1000,
  })
}

/**
 * Start a performance transaction
 */
export function startTransaction(
  name: string,
  op: string
): ReturnType<typeof Sentry.startSpan> | null {
  if (!isSentryConfigured) return null

  return Sentry.startSpan({ name, op }, (span) => span)
}

/**
 * Wrap an async function with error tracking
 */
export async function withErrorTracking<T>(
  fn: () => Promise<T>,
  context?: {
    operation: string
    userId?: string
    extra?: Record<string, unknown>
  }
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    captureError(error, {
      action: context?.operation,
      userId: context?.userId,
      extra: context?.extra,
    })
    throw error
  }
}
