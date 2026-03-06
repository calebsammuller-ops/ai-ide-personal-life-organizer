import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { messageId, feedback } = body

  if (!messageId || !['helpful', 'not_helpful'].includes(feedback)) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }

  // Update the message with feedback
  const { error: updateError } = await (supabase
    .from('assistant_messages') as any)
    .update({ feedback })
    .eq('id', messageId)
    .eq('user_id', user.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Analyze feedback patterns asynchronously
  analyzeFeedbackPatterns(user.id, supabase).catch(console.error)

  return NextResponse.json({ success: true })
}

async function analyzeFeedbackPatterns(
  userId: string,
  supabase: ReturnType<typeof createClient>
) {
  // Fetch recent feedback data
  const { data: recentMessages } = await (supabase
    .from('assistant_messages') as any)
    .select('content, intent, feedback')
    .eq('user_id', userId)
    .eq('role', 'assistant')
    .not('feedback', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50) as { data: { content: string; intent: string | null; feedback: string }[] | null }

  if (!recentMessages || recentMessages.length < 5) return

  const helpfulMessages = recentMessages.filter((m: any) => m.feedback === 'helpful')
  const notHelpfulMessages = recentMessages.filter((m: any) => m.feedback === 'not_helpful')

  // Calculate response preferences
  const helpfulLengths = helpfulMessages.map(m => m.content.length)
  const avgHelpfulLength = helpfulLengths.length > 0
    ? helpfulLengths.reduce((a, b) => a + b, 0) / helpfulLengths.length
    : 300

  // Determine preferred length
  let preferredResponseLength: 'short' | 'medium' | 'long' = 'medium'
  if (avgHelpfulLength < 200) preferredResponseLength = 'short'
  else if (avgHelpfulLength > 500) preferredResponseLength = 'long'

  // Track intent success
  const intentFeedback: Record<string, { helpful: number; notHelpful: number }> = {}
  for (const msg of recentMessages) {
    if (!msg.intent) continue
    if (!intentFeedback[msg.intent]) {
      intentFeedback[msg.intent] = { helpful: 0, notHelpful: 0 }
    }
    intentFeedback[msg.intent][msg.feedback === 'helpful' ? 'helpful' : 'notHelpful']++
  }

  const successfulIntents = Object.entries(intentFeedback)
    .filter(([, v]) => v.helpful > v.notHelpful)
    .map(([k]) => k)

  // Update user preferences with response patterns
  const { data: prefs } = await (supabase
    .from('user_preferences') as any)
    .select('learned_patterns')
    .eq('user_id', userId)
    .single() as { data: { learned_patterns?: Record<string, unknown> } | null }

  const learnedPatterns = (prefs?.learned_patterns as Record<string, unknown>) || {}

  await (supabase
    .from('user_preferences') as any)
    .upsert({
      user_id: userId,
      learned_patterns: {
        ...learnedPatterns,
        responsePreferences: {
          preferredResponseLength,
          successfulIntents,
          totalFeedbackCount: recentMessages.length,
          helpfulRate: helpfulMessages.length / recentMessages.length,
          analyzedAt: new Date().toISOString(),
        },
      },
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    })
}
