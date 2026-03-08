import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendMessage } from '@/lib/ai/anthropicClient'
import { withAuth, withApiHandler } from '@/lib/api/middleware'
import { buildRAGChatSystemPrompt } from '@/lib/ai/prompts/knowledge'
import type { User } from '@supabase/supabase-js'

export const POST = withApiHandler(withAuth(async (request: Request, user: User) => {
  const supabase = await createClient()

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

  const notesForPrompt = notes.map(n => ({ ...n, zettelId: n.zettel_id }))
  const systemPrompt = buildRAGChatSystemPrompt(notesForPrompt)

  const messages = [
    ...history.slice(-6).map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: question },
  ]

  const result = await sendMessage({
    model: 'claude-opus-4-6',
    maxTokens: 1000,
    system: systemPrompt,
    messages,
    userId: user.id,
  })

  if (!result.success || !result.data) {
    return NextResponse.json({ error: 'Failed to query knowledge base' }, { status: 500 })
  }

  const answer = result.data.content

  // Extract cited note IDs from the answer
  const citedZettelIds = [...answer.matchAll(/\[(\d{12}[A-Z0-9]*)\]/g)].map(m => m[1])
  const relatedNotes = notes
    .filter(n => citedZettelIds.includes(n.zettel_id) ||
      answer.toLowerCase().includes(n.title.toLowerCase()))
    .slice(0, 5)
    .map(n => ({ id: n.id, title: n.title, zettelId: n.zettel_id }))

  return NextResponse.json({ answer, relatedNotes })
}))
