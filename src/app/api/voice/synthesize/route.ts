import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit'
import type { VoiceId } from '@/types/voice'

const VALID_VOICES: VoiceId[] = ['alloy', 'echo', 'fable', 'nova', 'onyx', 'shimmer']
const MAX_TEXT_LENGTH = 4096

export async function POST(request: NextRequest) {
  // Rate limit: 30 TTS requests per minute
  const rateLimitResult = await checkRateLimit(request, {
    limit: 30,
    windowSeconds: 60,
  })
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult)
  }

  // Authenticate
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Validate request
  let body: { text: string; voice: VoiceId }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { text, voice } = body

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 })
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters` },
      { status: 400 }
    )
  }

  if (!voice || !VALID_VOICES.includes(voice)) {
    return NextResponse.json(
      { error: `Invalid voice. Must be one of: ${VALID_VOICES.join(', ')}` },
      { status: 400 }
    )
  }

  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'Voice feature is not configured. OPENAI_API_KEY is missing.' },
      { status: 503 }
    )
  }

  const speed = body.speed ?? 1.0
  const model = body.model === 'tts-1' ? 'tts-1' : 'tts-1-hd'

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // Retry with exponential backoff on rate limit
    let response: Response | null = null
    let lastError: unknown = null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await openai.audio.speech.create({
          model,
          voice,
          input: text,
          response_format: 'mp3',
          speed: Math.max(0.25, Math.min(4.0, speed)),
        }) as unknown as Response
        break
      } catch (err) {
        lastError = err
        if (err instanceof OpenAI.APIError && err.status === 429 && attempt < 2) {
          // Wait 1s, then 3s before retrying
          await new Promise((r) => setTimeout(r, (attempt + 1) * 1500))
          continue
        }
        throw err
      }
    }
    if (!response) throw lastError

    // Stream the audio back
    const audioBuffer = Buffer.from(await response.arrayBuffer())

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('TTS synthesis error:', error)

    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'Voice service rate limit exceeded. Please try again shortly.' },
          { status: 429 }
        )
      }
      return NextResponse.json(
        { error: 'Voice synthesis failed. Please try again.' },
        { status: error.status || 500 }
      )
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred during voice synthesis.' },
      { status: 500 }
    )
  }
}
