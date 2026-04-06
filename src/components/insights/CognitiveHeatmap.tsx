'use client'

interface Note { tags?: string[] }

interface Props { notes: Note[] }

export function CognitiveHeatmap({ notes }: Props) {
  const tagCounts: Record<string, number> = {}
  notes.forEach(n => (n.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1 }))

  const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)
  if (sorted.length === 0) return null

  const max = sorted[0][1]
  const dominant = sorted.slice(0, 3).map(([t]) => t)
  const all = sorted.map(([t]) => t)
  const neglected = all.slice(-2)

  return (
    <div className="rounded-lg border border-border/40 bg-card">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30">
        <div className="w-0.5 h-3 bg-primary" />
        <p className="text-[10px] font-semibold text-primary/70">Cognitive Heatmap</p>
      </div>
      <div className="p-3 space-y-1.5">
        {sorted.map(([tag, count]) => (
          <div key={tag} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/60 w-20 truncate">{tag}</span>
            <div className="flex-1 h-1 bg-muted/30 overflow-hidden rounded-lg">
              <div
                className="h-full bg-primary/50 transition-all"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground/30 w-4 text-right">{count}</span>
          </div>
        ))}
        <p className="text-[10px] text-muted-foreground/30 pt-1 border-t border-border/20">
          Dominant: {dominant.join(', ')} · Neglected: {neglected.join(', ')}
        </p>
      </div>
    </div>
  )
}
