import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { question, history = [] } = await request.json()
    if (!question?.trim()) return NextResponse.json({ error: 'question required' }, { status: 400 })

    // Extract keywords from question (simple word split, filter stop words)
    const stopWords = new Set(['what', 'have', 'i', 'the', 'a', 'an', 'is', 'are', 'my', 'me', 'about', 'show', 'written', 'notes', 'know', 'can', 'do', 'you'])
    const keywords = question.toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .split(' ')
      .filter((w: string) => w.length > 2 && !stopWords.has(w))

    // Fetch notes matching keywords (search in title and tags)
    const keywordOr = keywords.slice(0, 5).map((k: string) => `title.ilike.%${k}%`).join(',')

    const [{ data: keywordNotes }, { data: topNotes }] = await Promise.all([
      keywords.length > 0
        ? supabase
            .from('knowledge_notes')
            .select('id, zettel_id, title, type, content, tags, confidence, importance')
            .eq('user_id', user.id)
            .eq('is_archived', false)
            .or(keywordOr)
            .limit(15)
        : Promise.resolve({ data: [] }),
      supabase
        .from('knowledge_notes')
        .select('id, zettel_id, title, type, content, tags, confidence, importance')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('importance', { ascending: false })
        .limit(10),
    ])

    // Merge and deduplicate
    const seenIds = new Set<string>()
    const notes: { id: string; zettel_id: string; title: string; type: string; content: string; tags: string[]; confidence: number; importance: number }[] = []
    for (const n of [...(keywordNotes || []), ...(topNotes || [])]) {
      if (!seenIds.has(n.id)) {
        seenIds.add(n.id)
        notes.push(n)
      }
    }

    if (notes.length === 0) {
      return NextResponse.json({
        answer: "You don't have any knowledge notes yet. Start by adding notes at /knowledge to build your second brain.",
        relatedNotes: [],
      })
    }

    const notesContext = notes
      .map(n => `[${n.zettel_id || n.id.slice(0, 8)}] [${n.type}] "${n.title}"\nTags: ${(n.tags || []).join(', ')}\n${n.content.slice(0, 300)}${n.content.length > 300 ? '...' : ''}`)
      .join('\n\n---\n\n')

    const systemPrompt = `You are a personal knowledge assistant with access to the user's Zettelkasten second brain.

Your job is to answer questions by searching through the user's notes and synthesizing insights.

Rules:
1. ONLY use information from the provided notes — never hallucinate
2. Always cite specific notes using [zettel_id] "Note Title" format
3. If a note is directly relevant, quote or paraphrase from it
4. If asked to list notes, return them clearly
5. If the answer isn't in the notes, say so honestly and suggest what note to create
6. Be concise but thorough

Available knowledge notes (${notes.length} total):

${notesContext}`

    const messages: Anthropic.MessageParam[] = [
      ...history.slice(-6).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: question },
    ]

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    })

    const answer = response.content[0].type === 'text' ? response.content[0].text : 'No response generated.'

    // Extract cited note IDs from the answer
    const citedZettelIds = [...answer.matchAll(/\[(\d{12}[A-Z0-9]*)\]/g)].map(m => m[1])
    const relatedNotes = notes
      .filter(n => citedZettelIds.includes(n.zettel_id) ||
        answer.toLowerCase().includes(n.title.toLowerCase()))
      .slice(0, 5)
      .map(n => ({ id: n.id, title: n.title, zettelId: n.zettel_id }))

    return NextResponse.json({ answer, relatedNotes })
  } catch (error) {
    console.error('Knowledge chat error:', error)
    return NextResponse.json({ error: 'Failed to query knowledge base' }, { status: 500 })
  }
}
