import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface ProcessedThought {
  processedContent: string
  category: 'idea' | 'task' | 'reminder' | 'note' | 'question' | 'goal' | 'reflection'
  priority: number
  tags: string[]
  extractedTasks: { content: string; priority?: number; dueDate?: string }[]
  extractedEvents: { title: string; date?: string; time?: string }[]
  sentiment: 'positive' | 'neutral' | 'negative'
  isProcessed: true
  aiSummary?: string
  suggestedActions?: string[]
}

/**
 * AI-powered thought processor using Claude
 * Analyzes thoughts and extracts actionable information
 */
export async function processThoughtWithAI(content: string, userContext?: {
  timezone?: string
  currentDate?: string
}): Promise<ProcessedThought> {
  const currentDate = userContext?.currentDate || new Date().toISOString().split('T')[0]

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `You are an intelligent personal assistant that analyzes thoughts and extracts actionable information. Your goal is to understand the user's intent and help them organize their thinking.

Analyze this thought and return a JSON response:

THOUGHT: "${content}"

TODAY'S DATE: ${currentDate}

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "processedContent": "A cleaner, more organized version of the original thought",
  "aiSummary": "A brief 1-sentence summary of the main point",
  "category": "One of: idea, task, reminder, note, question, goal, reflection",
  "priority": "Number 1-5 where 1=urgent/important, 5=low priority",
  "tags": ["relevant", "topic", "tags"],
  "sentiment": "One of: positive, neutral, negative",
  "extractedTasks": [
    {
      "content": "Clear, actionable task description",
      "priority": 1-5,
      "dueDate": "YYYY-MM-DD if mentioned or inferable, null otherwise"
    }
  ],
  "extractedEvents": [
    {
      "title": "Event title",
      "date": "YYYY-MM-DD if mentioned",
      "time": "HH:MM if mentioned"
    }
  ],
  "suggestedActions": ["Suggested next steps or related actions"]
}

Guidelines:
- Extract ALL actionable items as tasks, even implicit ones
- Identify any meetings, appointments, calls as events
- If dates like "tomorrow", "next week", "Monday" are mentioned, convert to actual dates
- Tags should be relevant keywords (work, health, family, finance, learning, etc.)
- Priority: urgent/critical=1, important=2, normal=3, low=4, someday=5
- Be helpful and proactive in suggestions
- If the thought is a question, suggest ways to find the answer
- If it's a goal, break it down into actionable steps`
        }
      ],
    })

    const textContent = response.content.find(block => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI')
    }

    // Parse the JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    return {
      processedContent: parsed.processedContent || content,
      category: parsed.category || 'note',
      priority: Number(parsed.priority) || 3,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      extractedTasks: Array.isArray(parsed.extractedTasks) ? parsed.extractedTasks : [],
      extractedEvents: Array.isArray(parsed.extractedEvents) ? parsed.extractedEvents : [],
      sentiment: parsed.sentiment || 'neutral',
      isProcessed: true,
      aiSummary: parsed.aiSummary,
      suggestedActions: Array.isArray(parsed.suggestedActions) ? parsed.suggestedActions : [],
    }
  } catch (error) {
    console.error('AI thought processing error:', error)
    // Fallback to basic processing if AI fails
    return fallbackProcess(content)
  }
}

/**
 * Fallback processing when AI is unavailable
 */
function fallbackProcess(content: string): ProcessedThought {
  const lowered = content.toLowerCase()

  let category: ProcessedThought['category'] = 'note'
  if (lowered.includes('?')) category = 'question'
  else if (lowered.includes('idea') || lowered.includes('what if')) category = 'idea'
  else if (lowered.includes('goal') || lowered.includes('want to')) category = 'goal'
  else if (lowered.includes('todo') || lowered.includes('need to')) category = 'task'
  else if (lowered.includes('remind') || lowered.includes('remember')) category = 'reminder'

  let priority = 3
  if (lowered.includes('urgent') || lowered.includes('asap')) priority = 1
  else if (lowered.includes('important')) priority = 2
  else if (lowered.includes('eventually') || lowered.includes('someday')) priority = 5

  const tags: string[] = []
  const keywords = ['work', 'personal', 'health', 'family', 'finance', 'learning', 'home', 'fitness']
  keywords.forEach(k => { if (lowered.includes(k)) tags.push(k) })

  return {
    processedContent: content,
    category,
    priority,
    tags,
    extractedTasks: [],
    extractedEvents: [],
    sentiment: 'neutral',
    isProcessed: true,
    aiSummary: content.slice(0, 100),
    suggestedActions: [],
  }
}

/**
 * Process multiple thoughts in batch
 */
export async function processThoughtsBatch(
  thoughts: { id: string; content: string }[],
  userContext?: { timezone?: string; currentDate?: string }
): Promise<Map<string, ProcessedThought>> {
  const results = new Map<string, ProcessedThought>()

  // Process in parallel with rate limiting (max 5 concurrent)
  const batchSize = 5
  for (let i = 0; i < thoughts.length; i += batchSize) {
    const batch = thoughts.slice(i, i + batchSize)
    const promises = batch.map(async (thought) => {
      const processed = await processThoughtWithAI(thought.content, userContext)
      results.set(thought.id, processed)
    })
    await Promise.all(promises)
  }

  return results
}
