import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data } = await supabase
      .from('research_missions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    const missions = (data || []).map(m => ({
      id: m.id,
      userId: m.user_id,
      topic: m.topic,
      description: m.description,
      status: m.status,
      sourcesProcessed: m.sources_processed,
      notesGenerated: m.notes_generated,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
    }))

    return NextResponse.json({ data: missions })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch missions' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { topic, description } = await request.json()
    if (!topic?.trim()) return NextResponse.json({ error: 'Topic required' }, { status: 400 })

    // Create the mission
    const { data: mission, error: missionError } = await supabase
      .from('research_missions')
      .insert({ user_id: user.id, topic, description })
      .select()
      .single()

    if (missionError) return NextResponse.json({ error: missionError.message }, { status: 400 })

    // Ask Claude to suggest 3 specific URLs/sources to research this topic
    const sourceResponse = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are a research agent. The user wants to research: "${topic}"
${description ? `Context: ${description}` : ''}

Suggest 3 high-quality, publicly accessible URLs that would give the best knowledge about this topic.
Prefer: Wikipedia articles, major tech blogs, reputable educational sites, arXiv papers, GitHub readmes.

Return JSON only:
{
  "sources": [
    { "url": "https://...", "title": "Why this source is valuable", "type": "article"|"paper"|"website" }
  ]
}`
      }],
    })

    const sourceText = sourceResponse.content[0].type === 'text' ? sourceResponse.content[0].text : ''
    const sourceJson = sourceText.match(/\{[\s\S]*\}/)
    let sourcesProcessed = 0
    let notesGenerated = 0

    if (sourceJson) {
      try {
        const { sources } = JSON.parse(sourceJson[0])
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

        for (const source of (sources || []).slice(0, 3)) {
          try {
            const extractRes = await fetch(`${baseUrl}/api/knowledge/extract-url`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Cookie: request.headers.get('cookie') || '',
              },
              body: JSON.stringify({ url: source.url, save: true }),
            })
            if (extractRes.ok) {
              const extractData = await extractRes.json()
              sourcesProcessed++
              notesGenerated += extractData.notesCreated || 0
            }
          } catch { /* skip failed sources */ }
        }
      } catch { /* skip JSON parse errors */ }
    }

    // Update mission with results
    const { data: updated } = await supabase
      .from('research_missions')
      .update({
        sources_processed: sourcesProcessed,
        notes_generated: notesGenerated,
        status: sourcesProcessed > 0 ? 'completed' : 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', mission.id)
      .select()
      .single()

    return NextResponse.json({
      data: {
        id: updated?.id || mission.id,
        userId: user.id,
        topic,
        description,
        status: updated?.status || 'active',
        sourcesProcessed,
        notesGenerated,
        createdAt: mission.created_at,
        updatedAt: updated?.updated_at || mission.created_at,
      }
    })
  } catch (error) {
    console.error('Mission error:', error)
    return NextResponse.json({ error: 'Failed to create mission' }, { status: 500 })
  }
}
