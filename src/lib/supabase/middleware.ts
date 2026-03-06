import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // -----------------------------------------------------------
  // ZERO NETWORK CALLS — cookie-only auth check.
  //
  // Previously this called supabase.auth.getSession() which makes
  // a network round-trip to Supabase. On Vercel Edge + mobile
  // networks this consistently causes MIDDLEWARE_INVOCATION_TIMEOUT.
  //
  // Fix: only check cookie presence here. Real session validation
  // and token refresh happens in API routes and server components
  // via createClient().auth.getSession().
  // -----------------------------------------------------------

  const hasAuthCookie = request.cookies.getAll().some(
    c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  )

  // Protected routes
  const protectedPaths = [
    '/calendar',
    '/habits',
    '/meal-planning',
    '/thought-organization',
    '/live-assistant',
    '/settings',
    '/dashboard',
    '/tasks',
    '/projects',
    '/insights',
    '/progress',
    '/food-history',
    '/time-tracking',
    '/docs',
    '/math',
    '/ai-decisions',
  ]

  const isProtectedRoute = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedRoute && !hasAuthCookie) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // NOTE: We intentionally do NOT redirect authenticated users away from
  // auth routes (/login, /signup). Because we only check cookie presence
  // (not validity), a stale/expired cookie would cause a redirect loop:
  //   /login → middleware sees cookie → redirect to / → page sees invalid session
  //   → redirect to /login → repeat. Let pages handle their own auth redirects.

  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
}
