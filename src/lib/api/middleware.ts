/**
 * API Route Middleware HOFs
 *
 * withAuth   — verifies Supabase session, injects authed user into handler
 * withApiHandler — wraps handler in try/catch with sanitized error response
 *
 * Usage:
 *   export const POST = withApiHandler(withAuth(async (req, user) => {
 *     // user is guaranteed non-null here
 *     return NextResponse.json({ ok: true })
 *   }))
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'
import type { User } from '@supabase/supabase-js'

type RouteContext = { params?: Record<string, string | string[]> }

type AuthedHandler = (
  request: Request,
  user: User,
  context?: RouteContext
) => Promise<Response>

type PlainHandler = (
  request: Request,
  context?: RouteContext
) => Promise<Response>

/**
 * Wraps a handler with Supabase auth validation.
 * Returns 401 if user is not authenticated.
 */
export function withAuth(handler: AuthedHandler): PlainHandler {
  return async (request: Request, context?: RouteContext) => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return handler(request, user, context)
  }
}

/**
 * Wraps a handler in try/catch.
 * Logs the real error server-side; returns a generic 500 to the client.
 */
export function withApiHandler(handler: PlainHandler): PlainHandler {
  return async (request: Request, context?: RouteContext) => {
    try {
      return await handler(request, context)
    } catch (error) {
      logError(error, { url: request.url, method: request.method })
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}
