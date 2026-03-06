/**
 * Health check endpoint for monitoring and load balancers
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  checks: {
    database: {
      status: 'up' | 'down'
      latencyMs?: number
      error?: string
    }
    anthropic: {
      status: 'up' | 'down' | 'unknown'
      configured: boolean
    }
    stripe: {
      status: 'up' | 'down' | 'unknown'
      configured: boolean
    }
  }
}

const startTime = Date.now()

export async function GET(): Promise<NextResponse<HealthStatus>> {
  const checks: HealthStatus['checks'] = {
    database: { status: 'down' },
    anthropic: {
      status: 'unknown',
      configured: !!process.env.ANTHROPIC_API_KEY,
    },
    stripe: {
      status: 'unknown',
      configured: !!process.env.STRIPE_SECRET_KEY,
    },
  }

  // Check database connectivity
  try {
    const dbStart = Date.now()
    const supabase = createClient()

    // Simple query to verify connection
    const { error } = await supabase
      .from('user_preferences')
      .select('count')
      .limit(1)
      .single()

    // PGRST116 means no rows, but connection is fine
    if (!error || error.code === 'PGRST116') {
      checks.database = {
        status: 'up',
        latencyMs: Date.now() - dbStart,
      }
    } else {
      checks.database = {
        status: 'down',
        error: error.message,
      }
    }
  } catch (error) {
    checks.database = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  // Check Anthropic API (just verify key is present, don't make actual call)
  if (checks.anthropic.configured) {
    checks.anthropic.status = 'up'
  }

  // Check Stripe (just verify key is present)
  if (checks.stripe.configured) {
    checks.stripe.status = 'up'
  }

  // Determine overall status
  let overallStatus: HealthStatus['status'] = 'healthy'

  if (checks.database.status === 'down') {
    overallStatus = 'unhealthy'
  } else if (!checks.anthropic.configured || !checks.stripe.configured) {
    overallStatus = 'degraded'
  }

  const response: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  }

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200

  return NextResponse.json(response, { status: statusCode })
}

// HEAD request for simple uptime checks
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 })
}
