import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [{ data: recentNotes }, { data: allNotes }, { data: events }, { data: links }] = await Promise.all([
      supabase.from('knowledge_notes')
        .select('id, zettel_id, title, type, tags, confidence, importance, source, created_at')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false }),
      supabase.from('knowledge_notes')
        .select('id, title, type, tags, importance')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('importance', { ascending: false })
        .limit(50),
      supabase.from('cognitive_events')
        .select('event_type, description, created_at')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('knowledge_links')
        .select('id')
        .eq('user_id', user.id),
    ])

    const noteCount = recentNotes?.length || 0
    const totalNotes = allNotes?.length || 0
    const eventCount = events?.length || 0
    const linkCount = links?.length || 0

    // Build tag frequency
    const tagFreq: Record<string, number> = {}
    for (const note of (recentNotes || [])) {
      for (const tag of (note.tags || [])) {
        tagFreq[tag] = (tagFreq[tag] || 0) + 1
      }
    }
    const topTags = Object.entries(tagFreq).sort((a, b) => b[1] - a[1]).slice(0, 8)

    // Note type breakdown
    const typeCount: Record<string, number> = {}
    for (const note of (recentNotes || [])) {
      typeCount[note.type] = (typeCount[note.type] || 0) + 1
    }

    // AI source vs user notes
    const aiNotes = (recentNotes || []).filter(n => n.source === 'AI').length
    const userNotes = noteCount - aiNotes

    const prompt = `You are a cognitive analytics engine. Generate a comprehensive Monthly Knowledge Report for a user's second brain.

Period: Last 30 days
Total notes in brain: ${totalNotes}
Notes created this period: ${noteCount} (${userNotes} by user, ${aiNotes} by AI)
Knowledge links: ${linkCount} total
Cognitive events: ${eventCount}

Recent notes (last 30 days):
${(recentNotes || []).slice(0, 25).map(n => `- [${n.type}] "${n.title}" ${n.source === 'AI' ? '(AI)' : ''}`).join('\n')}

Top knowledge clusters (by tag frequency):
${topTags.map(([tag, count]) => `${tag}: ${count} notes`).join(', ')}

Note type breakdown this period:
${Object.entries(typeCount).map(([type, count]) => `${type}: ${count}`).join(', ')}

Recent cognitive events:
${(events || []).slice(0, 10).map(e => `${e.event_type}: ${e.description}`).join('\n')}

Generate a rich, insightful monthly cognitive report in Markdown format. Include:

# Monthly Knowledge Report — ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}

## Executive Summary
2-3 sentences summarizing this month's intellectual activity.

## Knowledge Growth
Stats and observations about note creation velocity and patterns.

## Dominant Themes
The main intellectual territories explored this month.

## Intellectual Evolution
How thinking appears to have shifted or deepened compared to earlier patterns.

## Key Insights Generated
The most significant connections and ideas that emerged.

## Knowledge Gaps Identified
Areas where understanding appears incomplete or weak.

## Learning Velocity
Assessment of how rapidly knowledge is growing and in which directions.

## Recommendations for Next Month
3-5 specific actionable steps to deepen the knowledge graph.

## Curiosity Trajectory
Prediction of where thinking is headed based on current momentum.

Be specific, use the actual note titles and themes. Make it feel like a real intellectual performance review.`

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    })

    const report = response.content[0].type === 'text' ? response.content[0].text : 'Report generation failed'

    return NextResponse.json({ report, generatedAt: new Date().toISOString() })
  } catch (error) {
    console.error('Report error:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
