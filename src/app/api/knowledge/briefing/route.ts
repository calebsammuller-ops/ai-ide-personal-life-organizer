import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

  const { data: notes } = await supabase
    .from('knowledge_notes')
    .select('id, zettel_id, title, type, content, tags, confidence, importance, created_at')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('importance', { ascending: false })
    .limit(60)

  const { data: recentNotes } = await supabase
    .from('knowledge_notes')
    .select('title, type, content, tags, created_at')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: links } = await supabase
    .from('knowledge_links')
    .select('id')
    .eq('user_id', user.id)

  const { data: events } = await supabase
    .from('cognitive_events')
    .select('event_type, description, created_at')
    .eq('user_id', user.id)
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false })
    .limit(30)

  // Build tag clusters
  const tagClusters = new Map<string, number>()
  for (const note of (notes || [])) {
    for (const tag of (note.tags || [])) {
      tagClusters.set(tag, (tagClusters.get(tag) || 0) + 1)
    }
  }
  const topClusters = Array.from(tagClusters.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => `${tag}(${count})`)

  const prompt = `Generate a comprehensive cognitive briefing for a personal Zettelkasten knowledge base.

KNOWLEDGE BASE STATS:
- Total notes: ${(notes || []).length}
- Total links: ${(links || []).length}
- Notes added in last 30 days: ${(recentNotes || []).length}
- Recent activity: ${(events || []).map(e => e.description).slice(0, 10).join(' | ')}

TOP KNOWLEDGE CLUSTERS (by tag frequency):
${topClusters.join(', ')}

MOST IMPORTANT NOTES:
${(notes || []).slice(0, 15).map(n => `[${n.type}] "${n.title}" (importance: ${n.importance})`).join('\n')}

RECENT NOTES (last 30 days):
${(recentNotes || []).slice(0, 10).map(n => `"${n.title}" [${n.type}] — ${n.content?.slice(0, 100) || ''}`).join('\n')}

Generate a deep, personalized cognitive briefing. Be specific, not generic. Reference actual notes by name.

Return ONLY valid JSON:
{
  "briefing": string (2-3 sentences summarizing the current state of their second brain),
  "insights": [{"title": string, "content": string}] (3 key patterns or insights from recent notes),
  "opportunities": [{"title": string, "description": string}] (2 synthesis opportunities they're missing),
  "knowledgeGaps": [{"topic": string, "reason": string}] (top 2 gaps based on cluster analysis),
  "learningPath": string[] (3 specific topics to focus on next, in priority order),
  "cognitiveVelocity": string (assessment of how fast/efficiently they're building knowledge),
  "weeklyChallenge": string (one specific intellectual challenge to pursue this week),
  "connectionToMake": string (one specific link between two notes they should draw today)
}`

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2500,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = (response.content[0] as { type: string; text: string }).text
  let aiResult: Record<string, unknown>

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    aiResult = JSON.parse(jsonMatch ? jsonMatch[0] : text)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw: text }, { status: 500 })
  }

  // Cache the briefing
  await supabase.from('dashboard_briefings').upsert({
    user_id: user.id,
    briefing: aiResult.briefing,
    insights: aiResult.insights || [],
    opportunities: aiResult.opportunities || [],
    knowledge_gaps: aiResult.knowledgeGaps || [],
    learning_path: aiResult.learningPath || [],
    created_at: new Date().toISOString(),
  })

  // Update cognitive profile
  await supabase.from('user_cognitive_profile').upsert({
    user_id: user.id,
    top_topics: topClusters.slice(0, 5).map(c => c.split('(')[0]),
    idea_velocity: (recentNotes || []).length / 30,
    updated_at: new Date().toISOString(),
  })

  return NextResponse.json({ data: aiResult })
}

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('dashboard_briefings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!data) return NextResponse.json({ data: null })

  return NextResponse.json({
    data: {
      briefing: data.briefing,
      insights: data.insights,
      opportunities: data.opportunities,
      knowledgeGaps: data.knowledge_gaps,
      learningPath: data.learning_path,
      createdAt: data.created_at,
    }
  })
}
