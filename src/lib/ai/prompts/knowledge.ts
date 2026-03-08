/**
 * Knowledge prompt builders — centralized prompt templates for the knowledge graph AI features.
 * All prompts live here to prevent drift across routes.
 */

export interface NoteContext {
  id: string
  zettelId?: string
  title: string
  type: string
  content: string
  tags: string[]
  confidence?: number
  importance?: number
}

// ── RAG Chat ───────────────────────────────────────────────────────────────

export function buildRAGChatSystemPrompt(notes: NoteContext[]): string {
  const notesContext = notes
    .map(n =>
      `[${n.zettelId || n.id.slice(0, 8)}] [${n.type}] "${n.title}"\nTags: ${(n.tags || []).join(', ')}\n${n.content.slice(0, 300)}${n.content.length > 300 ? '...' : ''}`
    )
    .join('\n\n---\n\n')

  return `You are a personal knowledge assistant with access to the user's Zettelkasten second brain.

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
}

// ── Idea Expansion ─────────────────────────────────────────────────────────

export function buildIdeaExpandPrompt(
  seedIdea: string,
  noteSummary: string,
  context?: string
): string {
  return `You are an AI business strategist and innovation architect.

The user has the following knowledge background:
${noteSummary || 'No notes yet.'}
${context ? `\nAdditional context: ${context}` : ''}

The user wants to expand this seed idea into a full structured breakdown:
"${seedIdea}"

Return ONLY valid JSON:
{
  "title": "refined catchy name for the idea",
  "oneLiner": "one sentence elevator pitch",
  "market": "target market, estimated size, and opportunity",
  "features": ["core feature 1", "core feature 2", "core feature 3", "core feature 4"],
  "businessModel": "how it makes money (revenue streams, pricing model)",
  "competitors": ["competitor or analog 1", "competitor or analog 2", "competitor or analog 3"],
  "uniqueAdvantage": "what unique angle makes this hard to replicate (tie to user's knowledge if relevant)",
  "nextSteps": ["immediate action 1", "immediate action 2", "immediate action 3"],
  "risks": ["key risk 1", "key risk 2"],
  "noteContent": "a well-written permanent knowledge note summarizing this expanded idea (2-3 paragraphs)"
}`
}

// ── Knowledge Evolution ────────────────────────────────────────────────────

export function buildEvolutionInsightPrompt(notes: NoteContext[], userId: string): string {
  const noteList = notes
    .slice(0, 30)
    .map(n => `[${n.zettelId || n.id.slice(0, 8)}] [${n.type}] "${n.title}" - ${n.content?.slice(0, 80)}`)
    .join('\n')

  return `Analyze this Zettelkasten knowledge graph for user ${userId}.

Notes (${notes.length}):
${noteList}

Generate 2-3 NEW synthesis notes that reveal non-obvious connections, plus 3-5 new links.
Focus on cross-cluster insights that aren't already obvious.

Return JSON:
{
  "newNotes": [{"title": string, "type": "permanent"|"hub", "content": string, "tags": string[], "confidence": 0.7-0.9}],
  "newLinks": [{"sourceTitle": string, "targetTitle": string, "relationship": "supports"|"extends"|"derived_from"|"related"}]
}`
}

export function buildEvolutionPredictionPrompt(notes: NoteContext[], clusters: string[]): string {
  const noteTitles = notes.slice(0, 15).map(n => `"${n.title}"`).join(', ')

  return `Knowledge graph has ${notes.length} notes across clusters: ${clusters.join(', ')}.

Top notes: ${noteTitles}

Generate 4-5 specific predictions. Return JSON:
{
  "predictions": [
    {"prediction_type": "missing_link"|"knowledge_gap"|"emerging_cluster"|"idea_opportunity"|"next_topic", "description": string, "related_note_titles": string[], "confidence": number}
  ]
}`
}

export function buildNoteCompressionPrompt(notes: Array<{ title: string; content: string }>): string {
  return `Compress these ${notes.length} old fleeting notes into a single hub summary note.

Notes:
${notes.map(n => `- "${n.title}": ${n.content?.slice(0, 100)}`).join('\n')}

Return JSON: {"title": string, "content": string, "tags": string[]}`
}
