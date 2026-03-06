/**
 * Anthropic API client with graceful degradation, retry logic, and monitoring
 */

import Anthropic from '@anthropic-ai/sdk'
import { captureError, addBreadcrumb } from '@/lib/sentry'
import { logAiApiCall, logError } from '@/lib/logger'

// Circuit breaker state
interface CircuitBreakerState {
  failures: number
  lastFailure: number
  isOpen: boolean
}

const circuitBreaker: CircuitBreakerState = {
  failures: 0,
  lastFailure: 0,
  isOpen: false,
}

// Circuit breaker configuration
const FAILURE_THRESHOLD = 5 // Open circuit after 5 failures
const RESET_TIMEOUT_MS = 30000 // Try again after 30 seconds
const RETRY_ATTEMPTS = 3
const RETRY_DELAY_MS = 1000

// Initialize Anthropic client
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

export interface MessageRequest {
  model?: string
  maxTokens?: number
  system?: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  userId?: string
}

export interface MessageResponse {
  content: string
  inputTokens: number
  outputTokens: number
  model: string
}

export interface AIClientResult {
  success: boolean
  data?: MessageResponse
  error?: string
  degraded?: boolean
}

/**
 * Check if circuit breaker should allow request
 */
function shouldAllowRequest(): boolean {
  if (!circuitBreaker.isOpen) return true

  // Check if enough time has passed to try again
  if (Date.now() - circuitBreaker.lastFailure > RESET_TIMEOUT_MS) {
    // Half-open state: allow one request to test
    return true
  }

  return false
}

/**
 * Record a failure
 */
function recordFailure(): void {
  circuitBreaker.failures++
  circuitBreaker.lastFailure = Date.now()

  if (circuitBreaker.failures >= FAILURE_THRESHOLD) {
    circuitBreaker.isOpen = true
    logError('Circuit breaker opened for Anthropic API', {
      failures: circuitBreaker.failures,
    })
  }
}

/**
 * Record a success
 */
function recordSuccess(): void {
  circuitBreaker.failures = 0
  circuitBreaker.isOpen = false
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Make a request to Claude with retry logic and circuit breaker
 */
export async function sendMessage(request: MessageRequest): Promise<AIClientResult> {
  // Check if API is configured
  if (!anthropic) {
    return {
      success: false,
      error: 'Anthropic API not configured',
      degraded: true,
    }
  }

  // Check circuit breaker
  if (!shouldAllowRequest()) {
    return {
      success: false,
      error: 'AI service temporarily unavailable. Please try again later.',
      degraded: true,
    }
  }

  const model = request.model || 'claude-sonnet-4-20250514'
  const maxTokens = request.maxTokens || 1024

  addBreadcrumb('AI API call started', 'ai', { model, maxTokens })

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    const startTime = Date.now()

    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        system: request.system,
        messages: request.messages,
      })

      const durationMs = Date.now() - startTime

      // Extract text content
      const textContent = response.content.find(block => block.type === 'text')
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in response')
      }

      // Log successful call
      logAiApiCall(
        model,
        response.usage.input_tokens,
        response.usage.output_tokens,
        durationMs,
        request.userId
      )

      // Record success
      recordSuccess()

      return {
        success: true,
        data: {
          content: textContent.text,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          model: response.model,
        },
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      const durationMs = Date.now() - startTime

      // Log the error
      logError(error, {
        attempt,
        model,
        durationMs,
        userId: request.userId,
      })

      // Check if it's a retryable error
      const isRetryable = isRetryableError(error)

      if (!isRetryable || attempt === RETRY_ATTEMPTS) {
        recordFailure()
        captureError(error, {
          userId: request.userId,
          action: 'anthropic_api_call',
          extra: { model, attempt },
        })
        break
      }

      // Wait before retrying (exponential backoff)
      await sleep(RETRY_DELAY_MS * Math.pow(2, attempt - 1))
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Unknown error occurred',
    degraded: true,
  }
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Anthropic.APIError) {
    // Retry on rate limits and server errors
    return error.status === 429 || error.status >= 500
  }

  // Retry on network errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('socket')
    )
  }

  return false
}

/**
 * Get fallback response for when AI is unavailable
 */
export function getFallbackResponse(): string {
  const responses = [
    "I'm experiencing some technical difficulties right now. Please try again in a moment.",
    "Our AI service is temporarily unavailable. Your request has been noted, and we'll be back shortly.",
    "I'm having trouble connecting right now. Please try again in a few seconds.",
  ]
  return responses[Math.floor(Math.random() * responses.length)]
}

/**
 * Check AI service status
 */
export function getServiceStatus(): {
  available: boolean
  configured: boolean
  circuitOpen: boolean
} {
  return {
    available: !!anthropic && !circuitBreaker.isOpen,
    configured: !!anthropic,
    circuitOpen: circuitBreaker.isOpen,
  }
}
