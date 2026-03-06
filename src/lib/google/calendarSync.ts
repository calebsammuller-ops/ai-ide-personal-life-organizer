import { google } from 'googleapis'
import { SupabaseClient } from '@supabase/supabase-js'
import { getGoogleOAuthClient } from './config'

interface SyncResult {
  imported: number
  updated: number
  errors: number
}

export async function syncGoogleCalendar(
  userId: string,
  supabase: SupabaseClient
): Promise<SyncResult> {
  // Get stored tokens
  const { data: integration } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google_calendar')
    .single()

  if (!integration) {
    throw new Error('Google Calendar not connected')
  }

  const oauth2Client = getGoogleOAuthClient()
  oauth2Client.setCredentials({
    access_token: integration.access_token,
    refresh_token: integration.refresh_token,
    expiry_date: integration.token_expiry ? new Date(integration.token_expiry).getTime() : undefined,
  })

  // Refresh token if expired
  if (integration.token_expiry && new Date(integration.token_expiry) < new Date()) {
    const { credentials } = await oauth2Client.refreshAccessToken()
    await supabase
      .from('user_integrations')
      .update({
        access_token: credentials.access_token,
        token_expiry: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', integration.id)

    oauth2Client.setCredentials(credentials)
  }

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  // Fetch events for the next 30 days
  const now = new Date()
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const { data: eventsResponse } = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: thirtyDaysLater.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 250,
  })

  const googleEvents = eventsResponse?.items || []

  // Get or create the Google calendar entry
  let { data: calendarEntry } = await supabase
    .from('calendars')
    .select('id')
    .eq('user_id', userId)
    .eq('external_source', 'google')
    .single()

  if (!calendarEntry) {
    const { data: newCalendar } = await supabase
      .from('calendars')
      .insert({
        user_id: userId,
        name: 'Google Calendar',
        color: '#4285F4',
        is_primary: false,
        is_visible: true,
        external_source: 'google',
        external_id: 'primary',
      })
      .select('id')
      .single()
    calendarEntry = newCalendar
  }

  if (!calendarEntry) {
    throw new Error('Failed to create calendar entry')
  }

  const result: SyncResult = { imported: 0, updated: 0, errors: 0 }

  for (const event of googleEvents) {
    if (!event.id || !event.summary) continue

    const startTime = event.start?.dateTime || event.start?.date
    const endTime = event.end?.dateTime || event.end?.date

    if (!startTime || !endTime) continue

    const eventData = {
      user_id: userId,
      calendar_id: calendarEntry.id,
      title: event.summary,
      description: event.description || null,
      location: event.location || null,
      start_time: startTime,
      end_time: endTime,
      all_day: !event.start?.dateTime,
      status: event.status === 'cancelled' ? 'cancelled' : 'confirmed',
      external_id: event.id,
      metadata: { externalSource: 'google', googleEventLink: event.htmlLink },
    }

    try {
      // Check if event already exists
      const { data: existing } = await supabase
        .from('calendar_events')
        .select('id')
        .eq('user_id', userId)
        .eq('external_id', event.id)
        .single()

      if (existing) {
        await supabase
          .from('calendar_events')
          .update(eventData)
          .eq('id', existing.id)
        result.updated++
      } else {
        await supabase
          .from('calendar_events')
          .insert(eventData)
        result.imported++
      }
    } catch {
      result.errors++
    }
  }

  // Update last synced timestamp
  await supabase
    .from('user_integrations')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', integration.id)

  return result
}
