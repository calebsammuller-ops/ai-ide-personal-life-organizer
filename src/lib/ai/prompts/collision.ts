/**
 * Idea Collision Engine prompt builder.
 * Takes two unrelated knowledge clusters and generates a breakthrough concept.
 */

export function buildCollisionPrompt(
  clusterA: { theme: string; notes: string[] },
  clusterB: { theme: string; notes: string[] }
): string {
  return `You are the Idea Collision Engine — a creative synthesizer that finds hidden bridges between unrelated domains.

You have been given two knowledge clusters from a user's personal knowledge graph:

CLUSTER A — "${clusterA.theme}"
${clusterA.notes.map((n, i) => `${i + 1}. ${n}`).join('\n')}

CLUSTER B — "${clusterB.theme}"
${clusterB.notes.map((n, i) => `${i + 1}. ${n}`).join('\n')}

These two clusters appear unrelated. Your job is to find the hidden connection and generate ONE breakthrough concept by combining them.

Rules:
1. The collision concept must genuinely combine ideas from BOTH clusters — not just mention one
2. Be specific and concrete — not generic like "use AI to improve X"
3. The concept should feel surprising yet obvious in hindsight
4. Applications should be distinct and actionable
5. The techApproach should be grounded and realistic

Return ONLY valid JSON:
{
  "collision": {
    "title": string (a punchy, specific name for the breakthrough concept),
    "concept": string (2-3 sentences explaining exactly how the two domains fuse into something new),
    "applications": string[] (3-4 specific, distinct use cases or products),
    "techApproach": string (concrete technical approach or architecture, 1-2 sentences),
    "firstStep": string (the most valuable immediate action to explore this concept)
  }
}`
}
