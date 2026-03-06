import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get recent messages to derive unique conversation IDs
  const { data, error } = await (supabase
    .from('assistant_messages') as any)
    .select('conversation_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Deduplicate by conversation_id, keeping most recent
  const seen = new Set<string>()
  const conversations: { id: string; lastMessageAt: string }[] = []
  for (const msg of (data || [])) {
    if (!seen.has(msg.conversation_id)) {
      seen.add(msg.conversation_id)
      conversations.push({ id: msg.conversation_id, lastMessageAt: msg.created_at })
    }
  }

  return NextResponse.json({ data: conversations.slice(0, 10) })
}
