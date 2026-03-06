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

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { image, text, subject = 'Mathematics' } = body

    if (!image && !text) {
      return NextResponse.json({ error: 'Either an image or text problem is required' }, { status: 400 })
    }

    const useLatex = ['Mathematics', 'Physics', 'Chemistry'].includes(subject)
    const useCode = subject === 'Computer Science'

    // Build message content
    const content: Anthropic.ContentBlockParam[] = []

    if (image) {
      const matches = image.match(/^data:(.+);base64,(.+)$/)
      if (!matches) {
        return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
      }
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: matches[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: matches[2],
        },
      })
    }

    const expressionGuidance = useLatex
      ? 'Format all mathematical expressions in LaTeX (\\\\frac{}{}, \\\\sqrt{}, \\\\int, etc.). The "expression" field must be valid LaTeX.'
      : useCode
      ? 'The "expression" field should contain a code snippet or pseudocode. Use plain text, no LaTeX.'
      : 'The "expression" field should contain a plain-text key fact, quote, or concise statement. No LaTeX, no code.'

    content.push({
      type: 'text',
      text: `${image ? `Analyze the ${subject} problem or question in this image.` : `Answer this ${subject} question: ${text}`}

Return a JSON object with a detailed step-by-step explanation. ${expressionGuidance}

{
  "problemText": "the question or problem restated clearly",
  "steps": [
    {
      "stepNumber": 1,
      "description": "Brief description of what this step covers",
      "expression": "${useLatex ? 'LaTeX expression' : useCode ? 'code snippet or pseudocode' : 'key fact or statement'}",
      "explanation": "Detailed explanation of this step"
    }
  ],
  "finalAnswer": "The final answer or conclusion${useLatex ? ' in LaTeX' : ''}",
  "alternativeMethods": [
    {
      "name": "Alternative approach or perspective",
      "steps": [same step format]
    }
  ],
  "difficulty": "easy|medium|hard|advanced",
  "topics": ["relevant ${subject} topic"],
  "concepts": ["key concept"],
  "explanation": "High-level overview of the answer"
}

GUIDELINES:
- Be thorough — explain WHY each step is taken
- Include at least one alternative method or perspective if applicable
- Classify difficulty and topics accurately for ${subject} at university level
- Return ONLY valid JSON`,
    })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content }],
    })

    const textContent = response.content.find(block => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'Failed to solve problem' }, { status: 500 })
    }

    // Parse JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse solution', raw: textContent.text }, { status: 500 })
    }

    const solution = JSON.parse(jsonMatch[0])

    // Save to database
    const { data: saved } = await supabase
      .from('math_problems')
      .insert({
        user_id: user.id,
        problem_text: solution.problemText || text || 'Image problem',
        solution,
        difficulty: solution.difficulty,
        topics: solution.topics || [],
        subject,
        source: image ? 'photo' : 'typed',
      })
      .select()
      .single()

    // Update stats
    await supabase.rpc('increment_math_stats', { p_user_id: user.id }).catch(() => {
      // If RPC doesn't exist, upsert manually
      supabase
        .from('math_stats')
        .upsert({
          user_id: user.id,
          total_problems_solved: 1,
          last_practiced_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
    })

    return NextResponse.json({ data: { ...solution, id: saved?.id } })
  } catch (error) {
    console.error('Math solve error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to solve problem' },
      { status: 500 }
    )
  }
}
