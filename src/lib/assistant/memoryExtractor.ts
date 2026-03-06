import Anthropic from '@anthropic-ai/sdk'
import type { UserMemory, AssistantMessage } from '@/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function extractMemoriesFromConversation(
  messages: AssistantMessage[],
  existingMemories: UserMemory[]
): Promise<UserMemory[]> {
  if (!process.env.ANTHROPIC_API_KEY || messages.length < 3) {
    return []
  }

  const conversation = messages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n')

  const existingFacts = existingMemories
    .map(m => m.content)
    .join('\n- ')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Analyze this conversation and extract NEW personal facts about the user.

EXISTING FACTS (don't repeat these):
${existingFacts ? `- ${existingFacts}` : 'None yet'}

CONVERSATION:
${conversation}

Extract facts about:
- Personal preferences (food, exercise, schedule preferences, work style)
- Life circumstances (job, family, location, timezone)
- Health considerations (allergies, dietary restrictions, fitness goals)
- Goals and aspirations
- Routines and habits
- Personality traits and communication preferences

Return a JSON array of NEW facts only. Each fact should be:
- Specific and actionable (not vague like "user is busy")
- Something the assistant should remember for future conversations
- Phrased as a statement about the user
- Based on observable evidence from the conversation

Format:
[{
  "content": "User prefers morning workouts before 7am",
  "category": "preference",
  "confidence": 0.8,
  "relatedEntities": ["exercise", "morning", "schedule"],
  "evidenceBasis": "User said 'I always work out before 7' in conversation"
}]

Categories: personal, preference, routine, goal, lifestyle, health, work
Confidence: 0.5-1.0 (1.0 = explicitly stated, 0.5-0.7 = inferred from behavior)
evidenceBasis: What observable behavior or statement this fact is based on.

Return ONLY the JSON array. Return [] if no new facts found.`
    }]
  })

  const textContent = response.content.find(block => block.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    return []
  }

  try {
    const jsonMatch = textContent.text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      content: string
      category: UserMemory['category']
      confidence: number
      relatedEntities?: string[]
      evidenceBasis?: string
    }>

    const now = new Date().toISOString()
    return parsed.map(m => ({
      id: crypto.randomUUID(),
      content: m.content,
      category: m.category || 'personal',
      confidence: Math.min(1, Math.max(0.5, m.confidence || 0.7)),
      source: 'inferred' as const,
      createdAt: now,
      lastReferenced: now,
      referenceCount: 1,
      relatedEntities: m.relatedEntities || [],
      evidenceBasis: m.evidenceBasis || 'inferred from conversation',
      contradicts: [],
      lastVerified: now,
    }))
  } catch {
    console.error('Failed to parse memory extraction response')
    return []
  }
}

export function mergeMemories(
  existing: UserMemory[],
  newMemories: UserMemory[]
): UserMemory[] {
  const merged = [...existing]
  const now = new Date().toISOString()

  for (const newMem of newMemories) {
    // Check for similar existing memories
    const similarIdx = merged.findIndex(m =>
      isSimilarMemory(m.content, newMem.content)
    )

    if (similarIdx >= 0) {
      // Boost confidence of existing similar memory
      merged[similarIdx] = {
        ...merged[similarIdx],
        confidence: Math.min(1, merged[similarIdx].confidence + 0.1),
        lastReferenced: now,
        referenceCount: merged[similarIdx].referenceCount + 1,
        lastVerified: now,
      }
      continue
    }

    // Check for contradictions with existing memories
    const contradictionIdx = merged.findIndex(m =>
      isContradictoryMemory(m.content, newMem.content, m.category, newMem.category)
    )

    if (contradictionIdx >= 0) {
      // Mark both memories as contradicting each other
      merged[contradictionIdx] = {
        ...merged[contradictionIdx],
        contradicts: [...(merged[contradictionIdx].contradicts || []), newMem.id],
        confidence: Math.max(0.3, merged[contradictionIdx].confidence - 0.15),
      }
      merged.push({
        ...newMem,
        contradicts: [merged[contradictionIdx].id],
      })
    } else {
      // No similar, no contradiction — add new
      merged.push(newMem)
    }
  }

  // Sort by confidence and recency
  return merged
    .sort((a, b) => {
      const confDiff = b.confidence - a.confidence
      if (Math.abs(confDiff) > 0.1) return confDiff
      return new Date(b.lastReferenced).getTime() - new Date(a.lastReferenced).getTime()
    })
    .slice(0, 50) // Keep top 50 memories
}

function isSimilarMemory(a: string, b: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const aNorm = normalize(a)
  const bNorm = normalize(b)

  // Simple similarity check: if one contains 60%+ of the other's words
  const aWords = a.toLowerCase().split(/\s+/)
  const bWordsSet = new Set(b.toLowerCase().split(/\s+/))

  let overlap = 0
  for (const word of aWords) {
    if (bWordsSet.has(word)) overlap++
  }

  const similarity = overlap / Math.min(aWords.length, bWordsSet.size)
  return similarity > 0.6 || aNorm.includes(bNorm) || bNorm.includes(aNorm)
}

/**
 * Detect if two memories contradict each other.
 * Only checks within the same category. Requires a negation pattern
 * match AND at least one shared subject word (3+ chars).
 */
function isContradictoryMemory(a: string, b: string, catA: string, catB: string): boolean {
  if (catA !== catB) return false

  const aLower = a.toLowerCase()
  const bLower = b.toLowerCase()

  const negationPairs = [
    ['likes', 'dislikes'], ['prefers', 'avoids'], ['enjoys', 'hates'],
    ['morning', 'evening'], ['early', 'late'], ['always', 'never'],
    ['wants to', "doesn't want to"], ['is a', 'is not a'],
  ]

  for (const [pos, neg] of negationPairs) {
    if ((aLower.includes(pos) && bLower.includes(neg)) ||
        (aLower.includes(neg) && bLower.includes(pos))) {
      // Check for shared subject word (3+ chars)
      const aWords = aLower.split(/\s+/).filter(w => w.length > 3)
      const bWords = new Set(bLower.split(/\s+/).filter(w => w.length > 3))
      const shared = aWords.filter(w => bWords.has(w))
      if (shared.length >= 1) return true
    }
  }
  return false
}

export function decayMemoryConfidence(memories: UserMemory[]): UserMemory[] {
  const now = new Date()

  return memories
    .map(memory => {
      const lastRef = new Date(memory.lastReferenced)
      const daysSinceRef = (now.getTime() - lastRef.getTime()) / (1000 * 60 * 60 * 24)

      // Explicit memories decay slower
      const baseDecayRate = memory.source === 'explicit' ? 0.02 : 0.05

      // Memories with contradictions decay faster
      const contradictionPenalty = (memory.contradicts?.length || 0) > 0 ? 0.03 : 0
      const decayRate = baseDecayRate + contradictionPenalty

      const decayFactor = Math.max(0.5, 1 - (daysSinceRef / 7) * decayRate)

      return {
        ...memory,
        confidence: memory.confidence * decayFactor,
      }
    })
    .filter(m => m.confidence > 0.2)
}

export function getTopMemories(memories: UserMemory[], limit: number = 15): UserMemory[] {
  return memories
    .filter(m => m.confidence >= 0.5)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit)
}

export function formatMemoriesForPrompt(memories: UserMemory[]): string {
  if (memories.length === 0) {
    return 'No personal information learned yet.'
  }

  const grouped: Record<string, string[]> = {}
  for (const mem of memories) {
    if (!grouped[mem.category]) {
      grouped[mem.category] = []
    }
    const confidenceTag = mem.confidence < 0.7 ? ` [~${Math.round(mem.confidence * 100)}% confident]` : ''
    const contradictionTag = (mem.contradicts?.length || 0) > 0 ? ' [contradicted]' : ''
    grouped[mem.category].push(`${mem.content}${confidenceTag}${contradictionTag}`)
  }

  const sections: string[] = []
  const categoryLabels: Record<string, string> = {
    personal: 'About You',
    preference: 'Your Preferences',
    routine: 'Your Routines',
    goal: 'Your Goals',
    lifestyle: 'Lifestyle',
    health: 'Health & Wellness',
    work: 'Work & Career',
  }

  for (const [category, items] of Object.entries(grouped)) {
    const label = categoryLabels[category] || category
    sections.push(`${label}:\n${items.map(i => `- ${i}`).join('\n')}`)
  }

  return sections.join('\n\n')
}
