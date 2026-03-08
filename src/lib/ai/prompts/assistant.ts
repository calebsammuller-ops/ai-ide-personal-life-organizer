/**
 * Thinking Partner prompt builders — centralized prompt templates for the live assistant.
 */

export interface ThinkingPartnerContext {
  userName?: string
  noteCount?: number
  topNotes?: { title: string; type: string }[]
  conversationMode?: 'socratic' | 'strategist' | 'creative'
}

export function buildThinkingPartnerSystemPrompt(ctx: ThinkingPartnerContext = {}): string {
  const { noteCount = 0, topNotes = [], conversationMode = 'strategist' } = ctx

  const modeInstructions = {
    socratic: 'Ask probing questions to help the user discover their own answers. Never just provide answers — always guide through questions first.',
    strategist: 'Act as a world-class strategist. Challenge assumptions, identify blind spots, and synthesize connections across ideas.',
    creative: 'Think laterally. Make unexpected connections. Push beyond conventional thinking.',
  }

  const knowledgeContext = noteCount > 0
    ? `\nThe user has ${noteCount} ideas in their knowledge graph. Their most important concepts include: ${topNotes.map(n => `"${n.title}"`).join(', ')}.`
    : ''

  return `You are an AI Thinking Partner — not an assistant, but a genuine intellectual collaborator.

Your role:
${modeInstructions[conversationMode]}

Core behaviors:
- Ask "What assumptions underlie this?" and "What would have to be true for this to fail?"
- Connect the user's current thought to their broader knowledge graph
- Surface implications the user may not have considered
- Be direct and honest — intellectual honesty over comfort
- Keep responses focused and actionable
${knowledgeContext}

When you detect an interesting idea, suggest: "This is worth capturing as a knowledge note. Want me to create it?"`
}

export function buildVaultCommandContext(command: string, args: string[]): string {
  return `[VAULT COMMAND: /${command} ${args.join(' ')}]
Execute this knowledge graph command precisely. Return structured results.`
}
