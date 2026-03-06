import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function detectSourceType(url: string): 'article' | 'video' | 'paper' | 'website' | 'pdf' {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'video'
  if (url.endsWith('.pdf') || url.includes('/pdf/') || url.includes('arxiv.org')) return 'paper'
  if (url.includes('medium.com') || url.includes('substack') || url.includes('blog')) return 'article'
  return 'website'
}

async function fetchUrlContent(url: string): Promise<{ content: string; title: string }> {
  // For YouTube, extract video ID and use oEmbed to get title
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]
    if (videoId) {
      try {
        const oEmbed = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
        const data = await oEmbed.json() as { title?: string }
        return {
          title: data.title || 'YouTube Video',
          content: `YouTube video: ${data.title || url}\nVideo ID: ${videoId}\nURL: ${url}\n\nThis is a YouTube video. Extract key concepts and learnings based on the title and context.`,
        }
      } catch { /* fall through */ }
    }
  }

  // For other URLs, fetch and extract text
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KnowledgeExtractor/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    })

    const html = await response.text()

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : url

    // Strip HTML tags and extract meaningful text
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 12000) // Limit to ~3000 tokens

    return { title, content: text }
  } catch {
    return {
      title: url,
      content: `Failed to fetch content from: ${url}. Please analyze the URL structure and domain to infer what this resource is about.`,
    }
  }
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url, save = true } = await request.json()
  if (!url?.trim()) return NextResponse.json({ error: 'URL is required' }, { status: 400 })

  const sourceType = detectSourceType(url)
  const { content, title: pageTitle } = await fetchUrlContent(url)

  const prompt = `You are extracting atomic Zettelkasten notes from web content.

SOURCE: ${url}
SOURCE TYPE: ${sourceType}
EXTRACTED TITLE: ${pageTitle}

CONTENT (may be partial):
${content}

TASK: Extract 3-7 atomic knowledge notes following Zettelkasten principles:
- Each note captures ONE idea
- Notes are written in your own words (not copied text)
- Each note is self-contained and makes sense alone
- Focus on the most valuable, surprising, or actionable insights
- Identify the correct note type for each concept

Also identify connections between the extracted notes.

Return ONLY valid JSON:
{
  "sourceTitle": string (clean title for the source),
  "summary": string (2-3 sentences about what this source is about),
  "notes": [
    {
      "title": string (concise, descriptive),
      "type": "reference" | "concept" | "permanent",
      "content": string (the insight in 2-5 sentences, written atomically),
      "tags": string[],
      "confidence": number (0.5-0.9 for extracted content)
    }
  ],
  "links": [
    {"sourceTitle": string, "targetTitle": string, "relationship": "supports" | "extends" | "related" | "derived_from"}
  ],
  "keyTakeaway": string (the single most important thing to remember from this source)
}`

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = (response.content[0] as { type: string; text: string }).text
  let aiResult: {
    sourceTitle: string
    summary: string
    notes: { title: string; type: string; content: string; tags: string[]; confidence: number }[]
    links: { sourceTitle: string; targetTitle: string; relationship: string }[]
    keyTakeaway: string
  }

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    aiResult = JSON.parse(jsonMatch ? jsonMatch[0] : text)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw: text }, { status: 500 })
  }

  let createdNotes: { id: string; title: string }[] = []

  if (save) {
    // Save research source
    const { data: source } = await supabase.from('research_sources').insert({
      user_id: user.id,
      source_type: sourceType,
      title: aiResult.sourceTitle || pageTitle,
      url,
      summary: aiResult.summary,
      notes_created: aiResult.notes?.length || 0,
      processed: true,
    }).select().single()

    // Insert notes
    for (const note of (aiResult.notes || [])) {
      const zettelBase = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)
      const zettelId = zettelBase + '_ex_' + Math.random().toString(36).slice(2, 5)

      const { data: inserted } = await supabase.from('knowledge_notes').insert({
        zettel_id: zettelId,
        user_id: user.id,
        title: note.title,
        type: note.type || 'reference',
        content: note.content || '',
        tags: note.tags || [],
        confidence: note.confidence ?? 0.7,
        importance: 0.5,
        source: 'external',
        source_url: url,
        is_archived: false,
      }).select().single()

      if (inserted) createdNotes.push({ id: inserted.id, title: note.title })
    }

    // Insert links
    let linksCreated = 0
    for (const link of (aiResult.links || [])) {
      const src = createdNotes.find(n => n.title.toLowerCase() === link.sourceTitle.toLowerCase())
      const tgt = createdNotes.find(n => n.title.toLowerCase() === link.targetTitle.toLowerCase())
      if (src && tgt && src.id !== tgt.id) {
        await supabase.from('knowledge_links').insert({
          user_id: user.id,
          source_note_id: src.id,
          target_note_id: tgt.id,
          relationship: link.relationship || 'related',
          strength: 0.7,
        }).catch(() => null)
        linksCreated++
      }
    }

    // Log cognitive event
    await supabase.from('cognitive_events').insert({
      user_id: user.id,
      event_type: 'research_added',
      related_note_ids: createdNotes.map(n => n.id),
      description: `Extracted ${createdNotes.length} notes from: ${aiResult.sourceTitle || url}. Key: ${aiResult.keyTakeaway?.slice(0, 100) || ''}`,
    })
  }

  return NextResponse.json({
    data: {
      ...aiResult,
      notesCreated: createdNotes.length,
      saved: save,
    }
  })
}
