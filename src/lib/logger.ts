/**
 * Structured logging utility for production
 * Uses pino for high-performance JSON logging
 */

import pino from 'pino'

const isProduction = process.env.NODE_ENV === 'production'
const isServer = typeof window === 'undefined'

// Create logger with appropriate configuration
export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  ...(isProduction
    ? {
        // Production: JSON format for log aggregation
        formatters: {
          level: (label) => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }
    : {
        // Development: Pretty print
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }),
})

// Context-aware logger for API routes
export function createRouteLogger(routeName: string) {
  return logger.child({ route: routeName })
}

// User-aware logger for authenticated requests
export function createUserLogger(routeName: string, userId: string) {
  return logger.child({ route: routeName, userId })
}

// Error logging with context
export function logError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  const errorObj = error instanceof Error
    ? {
        message: error.message,
        name: error.name,
        stack: error.stack,
      }
    : { message: String(error) }

  logger.error({ error: errorObj, ...context }, 'Error occurred')
}

// API request logging
export function logApiRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  userId?: string
): void {
  logger.info(
    {
      method,
      path,
      statusCode,
      durationMs,
      userId,
    },
    `${method} ${path} ${statusCode} ${durationMs}ms`
  )
}

// AI API call logging (for cost tracking)
export function logAiApiCall(
  model: string,
  inputTokens: number,
  outputTokens: number,
  durationMs: number,
  userId?: string
): void {
  logger.info(
    {
      type: 'ai_api_call',
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      durationMs,
      userId,
    },
    `AI API call: ${model} - ${inputTokens + outputTokens} tokens`
  )
}

// Business event logging
export function logBusinessEvent(
  event: string,
  data?: Record<string, unknown>
): void {
  logger.info({ event, ...data }, `Business event: ${event}`)
}

export default logger
