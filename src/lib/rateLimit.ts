/**
 * Rate limiting middleware for API routes
 * Uses Upstash Redis for distributed rate limiting in serverless environments
 * Falls back to in-memory rate limiting for development
 */

import { NextRequest, NextResponse } from 'next/server'

// In-memory rate limit store for development/fallback
const inMemoryStore = new Map<string, { count: number; resetTime: number }>()

interface RateLimitConfig {
  // Maximum requests allowed in the window
  limit: number
  // Time window in seconds
  windowSeconds: number
  // Identifier function (defaults to IP)
  identifier?: (request: NextRequest) => string
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  inMemoryStore.forEach((value, key) => {
    if (value.resetTime < now) {
      inMemoryStore.delete(key)
    }
  })
}, 60000) // Clean every minute

/**
 * In-memory rate limiter for development and fallback
 */
function inMemoryRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  const resetTime = now + windowMs

  const existing = inMemoryStore.get(identifier)

  if (!existing || existing.resetTime < now) {
    // New window
    inMemoryStore.set(identifier, { count: 1, resetTime })
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: resetTime,
    }
  }

  if (existing.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: existing.resetTime,
    }
  }

  existing.count++
  return {
    success: true,
    limit,
    remaining: limit - existing.count,
    reset: existing.resetTime,
  }
}

/**
 * Get client identifier from request
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from various headers (for proxied requests)
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')

  const ip = cfConnectingIp || realIp || forwardedFor?.split(',')[0] || 'unknown'
  return ip.trim()
}

/**
 * Rate limit check function
 */
export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const identifier = config.identifier
    ? config.identifier(request)
    : getClientIdentifier(request)

  const key = `ratelimit:${identifier}`

  // Check if Upstash is configured
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      // Dynamic import to avoid issues if not installed
      const { Ratelimit } = await import('@upstash/ratelimit')
      const { Redis } = await import('@upstash/redis')

      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })

      const ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.limit, `${config.windowSeconds} s`),
        analytics: true,
      })

      const result = await ratelimit.limit(key)

      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      }
    } catch (error) {
      console.error('Upstash rate limit error, falling back to in-memory:', error)
    }
  }

  // Fallback to in-memory rate limiting
  return inMemoryRateLimit(key, config.limit, config.windowSeconds)
}

/**
 * Rate limit response with proper headers
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.reset.toString(),
        'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
      },
    }
  )
}

/**
 * Rate limit headers for successful requests
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', result.limit.toString())
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
  response.headers.set('X-RateLimit-Reset', result.reset.toString())
  return response
}

// Pre-configured rate limiters for different use cases
export const rateLimitConfigs = {
  // Standard API endpoints: 100 requests per minute
  standard: { limit: 100, windowSeconds: 60 },

  // AI endpoints (expensive): 20 requests per minute
  ai: { limit: 20, windowSeconds: 60 },

  // Authentication: 10 attempts per 15 minutes
  auth: { limit: 10, windowSeconds: 900 },

  // Strict: 5 requests per minute (for sensitive operations)
  strict: { limit: 5, windowSeconds: 60 },
}

/**
 * Middleware wrapper for rate limiting
 */
export function withRateLimit(
  handler: (request: NextRequest, ...args: unknown[]) => Promise<NextResponse>,
  config: RateLimitConfig = rateLimitConfigs.standard
) {
  return async (request: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
    const result = await checkRateLimit(request, config)

    if (!result.success) {
      return rateLimitResponse(result)
    }

    const response = await handler(request, ...args)
    return addRateLimitHeaders(response, result)
  }
}
