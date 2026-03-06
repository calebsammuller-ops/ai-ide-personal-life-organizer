import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question, noteIds } = await request.json()
  if (!question?.trim()) return NextResponse.json({ error: 'Question is required' }, { status: 400 })

  // Fetch relevant notes (either specified or search by question content)
  let relevantNotes: { title: string; content: string; type: string; tags: string[] }[] = []

  if (noteIds?.length > 0) {
    const { data } = await supabase
      .from('knowledge_notes')
      .select('title, content, type, tags')
      .in('id', noteIds)
      .eq('user_id', user.id)
    relevantNotes = data || []
  } else {
    // Search for relevant notes using keyword matching
    const keywords = question.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3).slice(0, 5)
    if (keywords.length > 0) {
      const searchTerms = keywords.map((k: string) => `title.ilike.%${k}%,content.ilike.%${k}%`).join(',')
      const { data } = await supabase
        .from('knowledge_notes')
        .select('title, content, type, tags')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .or(searchTerms)
        .limit(15)
      relevantNotes = data || []
    }
  }

  const formattedNotes = relevantNotes.map(n =>
    `[${n.type}] "${n.title}"\n${n.content?.slice(0, 400) || ''}`
  ).join('\n---\n')

  const prompt = `You are a Socratic thinking partner. Your role is to deepen understanding through questioning — NEVER give direct answers.

QUESTION FROM USER: "${question}"

RELEVANT KNOWLEDGE FROM THEIR NOTES:
${formattedNotes || 'No specific notes provided — respond based on the question alone.'}

SOCRATIC APPROACH:
1. Identify hidden assumptions in the question
2. Find counter-arguments and edge cases
3. Ask deeper questions to explore the problem space
4. Point to knowledge gaps and blind spots
5. Reference any contradictions with their existing notes

Return ONLY valid JSON:
{
  "assumptions": [{"assumption": string, "challenge": string}],
  "counterArguments": [{"point": string, "implication": string}],
  "deeperQuestions": string[] (5-7 powerful questions to explore further),
  "blindSpots": string[] (what are they not seeing?),
  "relatedConcepts": string[] (concepts worth exploring that they haven't mentioned),
  "knowledgeGapsRevealed": string[] (what this question reveals they need to learn),
  "provocativeThesis": string (a bold statement that challenges their thinking),
  "synthesis": string (what integrating these perspectives might reveal)
}`

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2500,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = (response.content[0] as { type: string; text: string }).text
  let aiResult: Record<string, unknown>

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    aiResult = JSON.parse(jsonMatch ? jsonMatch[0] : text)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw: text }, { status: 500 })
  }

  return NextResponse.json({ data: aiResult })
}
