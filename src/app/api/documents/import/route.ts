import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>
import mammoth from 'mammoth'

function transformDocument(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    content: row.content,
    plainText: row.plain_text as string | null,
    projectId: row.project_id as string | null,
    isPinned: (row.is_pinned as boolean) || false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'File is required' }, { status: 400 })
  }

  // Derive title from filename (strip extension)
  const title = file.name.replace(/\.[^.]+$/, '') || 'Imported Document'

  // Extract text content based on file type
  let text = ''
  const name = file.name.toLowerCase()

  try {
    if (name.endsWith('.txt') || name.endsWith('.md')) {
      text = await file.text()
    } else if (name.endsWith('.pdf')) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const parsed = await pdfParse(buffer)
      text = parsed.text
    } else if (name.endsWith('.docx')) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload .txt, .md, .pdf, or .docx files.' },
        { status: 400 }
      )
    }
  } catch {
    return NextResponse.json({ error: 'Failed to extract text from file' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('documents')
    .insert({
      user_id: user.id,
      title,
      content: text,
      plain_text: text,
      is_pinned: false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: transformDocument(data) })
}
