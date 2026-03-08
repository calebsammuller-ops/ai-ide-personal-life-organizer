/**
 * Idea Evolution Engine
 * Records and retrieves how ideas grow over time through expansion, connection, and insight.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type EvolutionType = 'expansion' | 'connection' | 'insight'

export interface IdeaEvolution {
  id: string
  userId: string
  sourceNoteId: string
  derivedNoteId: string | null
  evolutionType: EvolutionType
  summary: string
  createdAt: string
}

export async function recordEvolution(
  supabase: SupabaseClient,
  userId: string,
  sourceNoteId: string,
  derivedNoteId: string | null,
  type: EvolutionType,
  summary: string
): Promise<void> {
  await supabase.from('idea_evolutions').insert({
    user_id: userId,
    source_note_id: sourceNoteId,
    derived_note_id: derivedNoteId,
    evolution_type: type,
    summary,
  }).catch(() => {})
}

export async function getIdeaTimeline(
  supabase: SupabaseClient,
  userId: string,
  noteId: string
): Promise<IdeaEvolution[]> {
  const { data, error } = await supabase
    .from('idea_evolutions')
    .select('*')
    .eq('user_id', userId)
    .eq('source_note_id', noteId)
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data || []).map(r => ({
    id: r.id as string,
    userId: r.user_id as string,
    sourceNoteId: r.source_note_id as string,
    derivedNoteId: r.derived_note_id as string | null,
    evolutionType: r.evolution_type as EvolutionType,
    summary: r.summary as string,
    createdAt: r.created_at as string,
  }))
}
