/**
 * Safe JSON extractor for AI responses.
 * Finds the first {...} block in AI output and parses it; returns fallback on any failure.
 */
export function parseAIJSON<T>(content: string, fallback: T): T {
  const match = content.match(/\{[\s\S]*\}/)
  if (!match) return fallback
  try {
    return JSON.parse(match[0]) as T
  } catch {
    return fallback
  }
}
