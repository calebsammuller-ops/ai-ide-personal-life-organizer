import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const audioBlob = formData.get('audio')

    if (!audioBlob || !(audioBlob instanceof Blob)) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    // Determine file extension from MIME type
    const type = audioBlob.type || 'audio/webm'
    const ext = type.includes('mp4') || type.includes('m4a') ? 'm4a' : 'webm'
    // Use audio/mp4 for m4a files (iOS), audio/webm for webm (Chrome/Firefox)
    const normalizedType = ext === 'm4a' ? 'audio/mp4' : 'audio/webm'
    const file = new File([audioBlob], `audio.${ext}`, { type: normalizedType })

    console.log('[Whisper] Audio type:', type, '→ file:', `audio.${ext}`, 'size:', audioBlob.size)

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'en',
    })

    return NextResponse.json({ text: transcription.text })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Whisper] Transcription error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
