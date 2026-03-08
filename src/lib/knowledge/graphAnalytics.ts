/**
 * Pure graph analytics functions — operate on in-memory note/link data.
 * No DB or API calls here.
 */

export interface NodeRef { id: string; title: string }

export interface GraphMetrics {
  orphanCount: number
  hubNodes: NodeRef[]       // degree ≥ 3
  clusterCount: number
  avgConnections: number
  mostLinkedNote: NodeRef | null
}

export interface Cluster {
  id: number
  nodeIds: string[]
}

// Build adjacency list from link pairs
function buildAdjacency(
  nodeIds: string[],
  links: { sourceNoteId: string; targetNoteId: string }[]
): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>(nodeIds.map(id => [id, new Set()]))
  for (const l of links) {
    adj.get(l.sourceNoteId)?.add(l.targetNoteId)
    adj.get(l.targetNoteId)?.add(l.sourceNoteId)
  }
  return adj
}

export function computeGraphMetrics(
  notes: NodeRef[],
  links: { sourceNoteId: string; targetNoteId: string }[]
): GraphMetrics {
  const nodeIds = notes.map(n => n.id)
  const adj = buildAdjacency(nodeIds, links)
  const noteById = new Map(notes.map(n => [n.id, n]))

  let orphanCount = 0
  let maxDegree = 0
  let mostLinkedId: string | null = null
  const hubNodeIds: string[] = []
  let totalDegree = 0

  for (const [id, neighbors] of adj) {
    const degree = neighbors.size
    totalDegree += degree
    if (degree === 0) orphanCount++
    if (degree >= 3) hubNodeIds.push(id)
    if (degree > maxDegree) { maxDegree = degree; mostLinkedId = id }
  }

  const clusters = detectClusters(notes, links)

  return {
    orphanCount,
    hubNodes: hubNodeIds.map(id => noteById.get(id)!).filter(Boolean),
    clusterCount: clusters.length,
    avgConnections: notes.length > 0 ? totalDegree / notes.length : 0,
    mostLinkedNote: mostLinkedId ? noteById.get(mostLinkedId) || null : null,
  }
}

export function detectClusters(
  notes: NodeRef[],
  links: { sourceNoteId: string; targetNoteId: string }[]
): Cluster[] {
  const nodeIds = notes.map(n => n.id)
  const adj = buildAdjacency(nodeIds, links)
  const visited = new Set<string>()
  const clusters: Cluster[] = []
  let clusterId = 0

  for (const id of nodeIds) {
    if (visited.has(id)) continue
    // BFS
    const queue = [id]
    const component: string[] = []
    visited.add(id)
    while (queue.length > 0) {
      const curr = queue.shift()!
      component.push(curr)
      for (const neighbor of adj.get(curr) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          queue.push(neighbor)
        }
      }
    }
    clusters.push({ id: clusterId++, nodeIds: component })
  }

  // Return non-singleton clusters first, sorted by size
  return clusters.sort((a, b) => b.nodeIds.length - a.nodeIds.length)
}
