import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const body = await request.json()
  const { content, conversationId, deepThink = false, attachment } = body

  if (!content?.trim()) {
    return new Response('No content', { status: 400 })
  }

  // Load user's knowledge notes for RAG context
  const { data: notes } = await supabase
    .from('knowledge_notes')
    .select('id, zettel_id, title, type, content, tags, confidence, importance')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('importance', { ascending: false })
    .limit(60)

  // Load conversation history
  let history: { role: string; content: string }[] = []
  if (conversationId) {
    const { data: msgs } = await supabase
      .from('assistant_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(30)
    history = msgs || []
  }

  const knowledgeContext = notes?.length
    ? notes
        .map(n =>
          `[${n.zettel_id || n.id.slice(0, 8)}] [${n.type.toUpperCase()}] "${n.title}"\n${n.content.slice(0, 250)}\nTags: ${(n.tags || []).join(', ') || 'none'}`
        )
        .join('\n\n---\n\n')
    : 'No notes yet. Encourage the user to capture ideas at /knowledge.'

  const systemPrompt = `You are a personal Thinking Partner — a direct, precise AI built around the user's own knowledge graph.

KNOWLEDGE BASE (${notes?.length || 0} personal notes):
${knowledgeContext}

BEHAVIOR:
- Reference the user's actual notes by title when relevant — this is YOUR memory of THEIR thinking
- Surface non-obvious connections between their ideas
- Be direct, no filler, no hedging unless genuinely uncertain
- State confidence level when unsure: "I'm ~70% confident..."
- Challenge weak reasoning directly but without moralizing
- End complex answers with one clear next move

FORMATTING (always use markdown):
- **Bold** key concepts and important terms
- \`inline code\` for code references, fenced blocks with language tag for multi-line
- Bullet lists for options, steps, or comparisons
- ## Headers for long structured responses
- Keep responses proportional: one sentence for simple questions, structured for complex ones
- Never use emojis in analytical responses

You have deep context on this user's thinking. Use it.`

  // Resolve or create conversation
  let resolvedConversationId = conversationId
  if (!resolvedConversationId) {
    const { data: convo } = await supabase
      .from('assistant_conversations')
      .insert({ user_id: user.id, title: content.slice(0, 60) })
      .select('id')
      .single()
    resolvedConversationId = convo?.id
  }

  // Save user message to DB
  await supabase.from('assistant_messages').insert({
    user_id: user.id,
    conversation_id: resolvedConversationId,
    role: 'user',
    content,
  })

  // Build messages for Claude — include history + current message
  const messages: Anthropic.MessageParam[] = [
    ...history.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ]

  // Add current message with optional image attachment
  if (attachment?.base64 && attachment?.mimeType?.startsWith('image/')) {
    messages.push({
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: attachment.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: attachment.base64,
          },
        },
        { type: 'text', text: content },
      ],
    })
  } else if (attachment?.extractedText) {
    // PDF/doc: text was extracted client-side or passed as extractedText
    messages.push({
      role: 'user',
      content: `${content}\n\n[Attached document content]:\n${attachment.extractedText}`,
    })
  } else {
    messages.push({ role: 'user', content })
  }

  // Create SSE streaming response
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let fullContent = ''

      try {
        const params: Anthropic.MessageCreateParams & { stream: true } = {
          model: deepThink ? 'claude-opus-4-6' : 'claude-sonnet-4-6',
          max_tokens: deepThink ? 16000 : 4096,
          system: systemPrompt,
          messages,
          stream: true,
        }

        // Extended thinking for Deep Think mode
        if (deepThink) {
          // @ts-ignore — extended thinking param
          params.thinking = { type: 'enabled', budget_tokens: 10000 }
        }

        const response = anthropic.messages.stream(params as Parameters<typeof anthropic.messages.stream>[0])

        for await (const chunk of response as AsyncIterable<Anthropic.Messages.RawMessageStreamEvent>) {
          if (
            chunk.type === 'content_block_delta' &&
            'delta' in chunk &&
            chunk.delta.type === 'text_delta'
          ) {
            fullContent += chunk.delta.text
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'delta', text: chunk.delta.text })}\n\n`
              )
            )
          }
        }

        // Save assistant message to DB
        await supabase.from('assistant_messages').insert({
          user_id: user.id,
          conversation_id: resolvedConversationId,
          role: 'assistant',
          content: fullContent,
        })

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'done', conversationId: resolvedConversationId })}\n\n`
          )
        )
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'error', message: String(error) })}\n\n`
          )
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
