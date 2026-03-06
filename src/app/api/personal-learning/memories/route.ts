import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { UserMemory } from '@/types'

// GET - Retrieve all memories
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .select('learned_patterns')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const memories = data?.learned_patterns?.userMemories || []

  // Group memories by category for easier display
  const grouped: Record<string, UserMemory[]> = {}
  for (const memory of memories) {
    if (!grouped[memory.category]) {
      grouped[memory.category] = []
    }
    grouped[memory.category].push(memory)
  }

  return NextResponse.json({
    data: {
      memories,
      grouped,
      totalCount: memories.length,
    }
  })
}

// POST - Add a new explicit memory
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { content, category } = body

  if (!content || !category) {
    return NextResponse.json(
      { error: 'Content and category are required' },
      { status: 400 }
    )
  }

  // Validate category
  const validCategories = ['personal', 'preference', 'routine', 'goal', 'lifestyle', 'health', 'work']
  if (!validCategories.includes(category)) {
    return NextResponse.json(
      { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
      { status: 400 }
    )
  }

  // Get current preferences
  const { data: prefs, error: fetchError } = await supabase
    .from('user_preferences')
    .select('learned_patterns')
    .eq('user_id', user.id)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const learnedPatterns = prefs?.learned_patterns || {}
  const memories: UserMemory[] = learnedPatterns.userMemories || []

  // Check for duplicate content
  const existingMemory = memories.find(
    m => m.content.toLowerCase() === content.toLowerCase()
  )

  if (existingMemory) {
    // Boost confidence of existing memory
    existingMemory.confidence = Math.min(1, existingMemory.confidence + 0.1)
    existingMemory.referenceCount += 1
    existingMemory.lastReferenced = new Date().toISOString()
  } else {
    // Add new memory
    const newMemory: UserMemory = {
      id: crypto.randomUUID(),
      category,
      content,
      confidence: 1.0, // Explicit memories start at max confidence
      source: 'explicit',
      createdAt: new Date().toISOString(),
      lastReferenced: new Date().toISOString(),
      referenceCount: 1,
    }
    memories.push(newMemory)
  }

  // Keep only top 50 memories by confidence
  memories.sort((a, b) => b.confidence - a.confidence)
  const trimmedMemories = memories.slice(0, 50)

  // Update preferences
  const { error: updateError } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: user.id,
      learned_patterns: {
        ...learnedPatterns,
        userMemories: trimmedMemories,
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    data: { success: true, memoryCount: trimmedMemories.length }
  })
}

// DELETE - Remove a memory by ID
export async function DELETE(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const memoryId = searchParams.get('id')

  if (!memoryId) {
    return NextResponse.json({ error: 'Memory ID is required' }, { status: 400 })
  }

  // Get current preferences
  const { data: prefs, error: fetchError } = await supabase
    .from('user_preferences')
    .select('learned_patterns')
    .eq('user_id', user.id)
    .single()

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const learnedPatterns = prefs?.learned_patterns || {}
  const memories: UserMemory[] = learnedPatterns.userMemories || []

  // Filter out the memory to delete
  const updatedMemories = memories.filter(m => m.id !== memoryId)

  if (updatedMemories.length === memories.length) {
    return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
  }

  // Update preferences
  const { error: updateError } = await supabase
    .from('user_preferences')
    .update({
      learned_patterns: {
        ...learnedPatterns,
        userMemories: updatedMemories,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    data: { success: true, memoryCount: updatedMemories.length }
  })
}
