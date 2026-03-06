import { SupabaseClient } from '@supabase/supabase-js'
import type { AssistantMessage, LearnedPatterns, UserMemory } from '@/types'
import {
  extractMemoriesFromConversation,
  mergeMemories,
  decayMemoryConfidence,
} from './memoryExtractor'

export async function triggerLearning(
  userId: string,
  conversationId: string,
  supabase: SupabaseClient
): Promise<void> {
  try {
    // Fetch conversation messages
    const { data: messages } = await supabase
      .from('assistant_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (!messages || messages.length < 3) return

    // Fetch existing learned patterns
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('learned_patterns')
      .eq('user_id', userId)
      .single()

    const learnedPatterns = (prefs?.learned_patterns as LearnedPatterns) || {}
    const existingMemories = learnedPatterns.userMemories || []

    // Apply decay to existing memories
    const decayedMemories = decayMemoryConfidence(existingMemories)

    // Extract new memories from conversation
    const newMemories = await extractMemoriesFromConversation(
      messages as AssistantMessage[],
      decayedMemories
    )

    if (newMemories.length === 0 && decayedMemories.length === existingMemories.length) {
      return // No changes needed
    }

    // Merge memories
    const mergedMemories = mergeMemories(decayedMemories, newMemories)

    // Update conversation patterns
    const conversationPatterns = updateConversationPatterns(
      learnedPatterns.conversationPatterns || { commonTopics: [], frequentIntents: {}, peakUsageTimes: [] },
      messages as AssistantMessage[]
    )

    // Save updated patterns
    await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        learned_patterns: {
          ...learnedPatterns,
          userMemories: mergedMemories,
          conversationPatterns,
        },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

    console.log(`Learning pipeline: extracted ${newMemories.length} new memories for user ${userId}`)
  } catch (error) {
    console.error('Learning pipeline error:', error)
  }
}

function updateConversationPatterns(
  existing: LearnedPatterns['conversationPatterns'],
  messages: AssistantMessage[]
): LearnedPatterns['conversationPatterns'] {
  const patterns = existing || {
    commonTopics: [],
    frequentIntents: {},
    peakUsageTimes: [],
  }

  // Track intents
  for (const msg of messages) {
    if (msg.intent) {
      patterns.frequentIntents[msg.intent] = (patterns.frequentIntents[msg.intent] || 0) + 1
    }
  }

  // Track usage time
  const hours = messages
    .filter(m => m.role === 'user')
    .map(m => new Date(m.createdAt).getHours())

  for (const hour of hours) {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`
    if (!patterns.peakUsageTimes.includes(timeStr)) {
      patterns.peakUsageTimes.push(timeStr)
    }
  }

  // Keep only most common usage times (top 5)
  const hourCounts: Record<string, number> = {}
  for (const time of patterns.peakUsageTimes) {
    hourCounts[time] = (hourCounts[time] || 0) + 1
  }
  patterns.peakUsageTimes = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([time]) => time)

  return patterns
}

export async function addExplicitMemory(
  userId: string,
  content: string,
  category: UserMemory['category'],
  supabase: SupabaseClient
): Promise<UserMemory> {
  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('learned_patterns')
    .eq('user_id', userId)
    .single()

  const learnedPatterns = (prefs?.learned_patterns as LearnedPatterns) || {}
  const existingMemories = learnedPatterns.userMemories || []

  const now = new Date().toISOString()
  const newMemory: UserMemory = {
    id: crypto.randomUUID(),
    category,
    content,
    confidence: 1.0, // Explicit memories have full confidence
    source: 'explicit',
    createdAt: now,
    lastReferenced: now,
    referenceCount: 1,
  }

  const mergedMemories = mergeMemories(existingMemories, [newMemory])

  await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      learned_patterns: {
        ...learnedPatterns,
        userMemories: mergedMemories,
      },
      updated_at: now,
    }, {
      onConflict: 'user_id',
    })

  return newMemory
}

export async function getConversationMessageCount(
  conversationId: string,
  supabase: SupabaseClient
): Promise<number> {
  const { count } = await supabase
    .from('assistant_messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)

  return count || 0
}
