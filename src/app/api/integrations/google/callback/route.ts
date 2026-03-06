import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGoogleOAuthClient } from '@/lib/google/config'
import { syncGoogleCalendar } from '@/lib/google/calendarSync'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // user ID

  if (!code || !state) {
    return NextResponse.redirect(new URL('/settings/preferences?error=google_auth_failed', request.url))
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!session || user.id !== state) {
    return NextResponse.redirect(new URL('/settings/preferences?error=google_auth_failed', request.url))
  }

  try {
    const oauth2Client = getGoogleOAuthClient()
    const { tokens } = await oauth2Client.getToken(code)

    // Store tokens
    await supabase
      .from('user_integrations')
      .upsert({
        user_id: user.id,
        provider: 'google_calendar',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        scopes: tokens.scope?.split(' ') || [],
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider',
      })

    // Trigger initial sync
    try {
      await syncGoogleCalendar(user.id, supabase)
    } catch {
      // Sync errors shouldn't block the connection
    }

    return NextResponse.redirect(new URL('/settings/preferences?google_connected=true', request.url))
  } catch {
    return NextResponse.redirect(new URL('/settings/preferences?error=google_auth_failed', request.url))
  }
}
