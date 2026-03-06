import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('user_consents')
    .select('*')
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const consents: Record<string, { granted: boolean; grantedAt: string | null }> = {}
  for (const row of data || []) {
    consents[row.consent_type] = {
      granted: row.granted,
      grantedAt: row.granted_at,
    }
  }

  return NextResponse.json({ data: consents })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { consentType, granted } = body

  if (!consentType || typeof granted !== 'boolean') {
    return NextResponse.json({ error: 'consentType and granted are required' }, { status: 400 })
  }

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('user_consents')
    .upsert({
      user_id: user.id,
      consent_type: consentType,
      granted,
      granted_at: granted ? now : null,
      revoked_at: granted ? null : now,
      updated_at: now,
    }, {
      onConflict: 'user_id,consent_type',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: { consentType, granted, grantedAt: data.granted_at } })
}
