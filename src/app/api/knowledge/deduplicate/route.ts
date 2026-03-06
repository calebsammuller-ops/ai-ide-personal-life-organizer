import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function titleSimilarity(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return 1.0
  const wordsA = new Set(na.split(/\s+/))
  const wordsB = new Set(nb.split(/\s+/))
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length
  const union = new Set([...wordsA, ...wordsB]).size
  return union > 0 ? intersection / union : 0
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const shouldMerge = body.merge === true

    const { data: notes } = await supabase
      .from('knowledge_notes')
      .select('id, zettel_id, title, content, tags, type, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })

    if (!notes || notes.length < 2) {
      return NextResponse.json({ data: [], message: 'Not enough notes to deduplicate' })
    }

    const pairs: {
      noteA: { id: string; title: string; zettelId?: string }
      noteB: { id: string; title: string; zettelId?: string }
      similarity: number
      recommendation: 'merge' | 'link'
    }[] = []

    // O(n²) title similarity check — acceptable for up to ~500 notes
    for (let i = 0; i < notes.length; i++) {
      for (let j = i + 1; j < notes.length; j++) {
        const sim = titleSimilarity(notes[i].title, notes[j].title)
        if (sim >= 0.7) {
          pairs.push({
            noteA: { id: notes[i].id, title: notes[i].title, zettelId: notes[i].zettel_id },
            noteB: { id: notes[j].id, title: notes[j].title, zettelId: notes[j].zettel_id },
            similarity: Math.round(sim * 100) / 100,
            recommendation: sim >= 0.9 ? 'merge' : 'link',
          })
        }
      }
      if (pairs.length >= 20) break // cap at 20 pairs
    }

    if (!shouldMerge) {
      return NextResponse.json({ data: pairs })
    }

    // Auto-merge pairs where recommendation === 'merge'
    let mergedCount = 0
    const mergePairs = pairs.filter(p => p.recommendation === 'merge')

    for (const pair of mergePairs) {
      const noteAData = notes.find(n => n.id === pair.noteA.id)
      const noteBData = notes.find(n => n.id === pair.noteB.id)
      if (!noteAData || !noteBData) continue

      // Keep newer note, append older content
      const newer = new Date(noteAData.updated_at) >= new Date(noteBData.updated_at) ? noteAData : noteBData
      const older = newer.id === noteAData.id ? noteBData : noteAData

      // Save version before merge
      await supabase.from('knowledge_note_versions').insert({
        note_id: newer.id,
        title: newer.title,
        content: newer.content,
      })

      // Merge content
      const mergedContent = `${newer.content}\n\n---\n*Merged from "${older.title}":*\n${older.content}`
      const mergedTags = [...new Set([...(newer.tags || []), ...(older.tags || [])])]

      await supabase.from('knowledge_notes')
        .update({ content: mergedContent, tags: mergedTags, updated_at: new Date().toISOString() })
        .eq('id', newer.id)

      // Archive the older duplicate
      await supabase.from('knowledge_notes')
        .update({ is_archived: true })
        .eq('id', older.id)

      // Migrate any links from old note to new note
      await supabase.from('knowledge_links')
        .update({ source_note_id: newer.id })
        .eq('source_note_id', older.id)

      await supabase.from('knowledge_links')
        .update({ target_note_id: newer.id })
        .eq('target_note_id', older.id)

      mergedCount++
    }

    return NextResponse.json({
      data: pairs,
      merged: mergedCount,
      message: shouldMerge ? `Merged ${mergedCount} duplicate pairs` : undefined,
    })
  } catch (error) {
    console.error('Deduplicate error:', error)
    return NextResponse.json({ error: 'Failed to deduplicate' }, { status: 500 })
  }
}
