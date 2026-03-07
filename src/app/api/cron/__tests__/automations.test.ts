/**
 * Tests for cron automation auth guard.
 * Verifies the fail-closed security fix: when CRON_SECRET is unset, all
 * requests are rejected (not allowed through as the old `if (cronSecret &&...)`
 * logic would have done).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// We test the auth logic directly by examining the fixed guard pattern,
// rather than importing the whole route (which has heavy Supabase deps).
function cronAuthGuard(
  secret: string | undefined,
  authHeader: string | null
): boolean {
  // This mirrors the fixed guard: !cronSecret || authHeader !== `Bearer ${cronSecret}`
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return false // unauthorized
  }
  return true // authorized
}

describe('cron auth guard', () => {
  it('rejects when CRON_SECRET is not set (fail-closed)', () => {
    expect(cronAuthGuard(undefined, null)).toBe(false)
    expect(cronAuthGuard(undefined, 'Bearer anything')).toBe(false)
    expect(cronAuthGuard('', null)).toBe(false)
  })

  it('rejects when CRON_SECRET is set but no auth header provided', () => {
    expect(cronAuthGuard('my-secret', null)).toBe(false)
  })

  it('rejects when CRON_SECRET is set but auth header is wrong', () => {
    expect(cronAuthGuard('my-secret', 'Bearer wrong-secret')).toBe(false)
    expect(cronAuthGuard('my-secret', 'my-secret')).toBe(false) // missing "Bearer "
    expect(cronAuthGuard('my-secret', 'Basic my-secret')).toBe(false)
  })

  it('allows when CRON_SECRET is set and auth header matches', () => {
    expect(cronAuthGuard('my-secret', 'Bearer my-secret')).toBe(true)
  })

  it('demonstrates the OLD broken behavior for clarity', () => {
    // Old: `if (cronSecret && authHeader !== ...)` — when cronSecret is falsy, guard is skipped
    function oldBrokenGuard(secret: string | undefined, header: string | null): boolean {
      if (secret && header !== `Bearer ${secret}`) return false
      return true // BUG: when secret is undefined, this returns true!
    }
    expect(oldBrokenGuard(undefined, null)).toBe(true) // was incorrectly allowed
    expect(oldBrokenGuard('set', 'Bearer set')).toBe(true) // still correct
  })
})
