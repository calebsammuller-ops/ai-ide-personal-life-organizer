import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { topic, difficulty, count, subject = 'Mathematics' } = await request.json()

  if (!topic || !difficulty) {
    return NextResponse.json({ error: 'topic and difficulty are required' }, { status: 400 })
  }

  const numProblems = Math.min(count || 5, 10)
  const useLatex = ['Mathematics', 'Physics', 'Chemistry'].includes(subject)
  const useCode = subject === 'Computer Science'

  const expressionFormat = useLatex
    ? 'Use LaTeX for all expressions (e.g. \\\\frac{}{}, \\\\int, etc.)'
    : useCode
    ? 'Use code snippets or pseudocode in the expression field'
    : 'Use plain text in the expression field — no LaTeX'

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `Generate ${numProblems} ${difficulty} ${subject} practice questions on the topic of "${topic}".

Return JSON in this exact format:
{
  "problems": [
    {
      "problemText": "The question or problem statement",
      "hint": "A helpful hint without giving away the answer",
      "solution": {
        "steps": [
          { "stepNumber": 1, "description": "...", "expression": "key expression or fact", "explanation": "..." }
        ],
        "finalAnswer": "The correct answer"
      },
      "difficulty": "${difficulty}",
      "topics": ["${topic}"],
      "concepts": ["relevant concept"]
    }
  ]
}

GUIDELINES:
- Questions should be appropriate for ${difficulty} university-level ${subject}
- ${expressionFormat}
- Each question should test a slightly different aspect of "${topic}"
- Include clear, educational hints that guide without revealing the answer
- Return ONLY valid JSON`,
      }],
    })

    const textContent = response.content.find(block => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'Failed to generate problems' }, { status: 500 })
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse problems' }, { status: 500 })
    }

    const result = JSON.parse(jsonMatch[0])

    // Create practice session
    const { data: sessionData } = await supabase
      .from('math_practice_sessions')
      .insert({
        user_id: user.id,
        topic,
        difficulty,
        subject,
        total_problems: result.problems?.length || numProblems,
      })
      .select()
      .single()

    return NextResponse.json({
      data: {
        sessionId: sessionData?.id,
        problems: result.problems || [],
      },
    })
  } catch (error) {
    console.error('Math generate error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate problems' },
      { status: 500 }
    )
  }
}
