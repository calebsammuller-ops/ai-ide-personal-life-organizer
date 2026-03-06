import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('task_attachments')
    .select('*')
    .eq('task_id', params.id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const attachments = (data ?? []).map((a) => ({
    id: a.id,
    taskId: a.task_id,
    fileName: a.file_name,
    fileSize: a.file_size,
    fileType: a.file_type,
    fileUrl: a.file_url,
    createdAt: a.created_at,
  }))

  return NextResponse.json({ data: attachments })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Upload to Supabase Storage
  const fileExt = file.name.split('.').pop()
  const filePath = `${user.id}/${params.id}/${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('task-attachments')
    .upload(filePath, file)

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage
    .from('task-attachments')
    .getPublicUrl(filePath)

  // Save attachment record
  const { data, error } = await supabase
    .from('task_attachments')
    .insert({
      task_id: params.id,
      user_id: user.id,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      file_url: urlData.publicUrl,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data: {
      id: data.id,
      taskId: data.task_id,
      fileName: data.file_name,
      fileSize: data.file_size,
      fileType: data.file_type,
      fileUrl: data.file_url,
      createdAt: data.created_at,
    },
  })
}
