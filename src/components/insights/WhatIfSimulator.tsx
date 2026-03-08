'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { WhatIfSimulation } from '@/types/knowledge'

const PROBABILITY_COLORS: Record<string, string> = {
  High: 'bg-green-500/15 text-green-400 border-green-500/30',
  Medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  Low: 'bg-red-500/15 text-red-400 border-red-500/30',
}

export function WhatIfSimulator() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<WhatIfSimulation | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSimulate = async () => {
    if (!question.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/knowledge/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      if (!res.ok) throw new Error('Simulation failed')
      const json = await res.json()
      setResult(json.data)
    } catch {
      setError('Failed to run simulation. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-purple-500" />
          What If Simulator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <textarea
            className="w-full min-h-[80px] px-3 py-2 text-sm rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
            placeholder="What if I focus on AI automation tools for the next 3 months?"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSimulate()
            }}
          />
          <Button
            className="w-full"
            onClick={handleSimulate}
            disabled={loading || !question.trim()}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Simulating...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" />Simulate</>
            )}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {result && (
          <div className="space-y-3">
            {/* Outcomes */}
            {result.outcomes.map((outcome, i) => (
              <div key={i} className="p-3 border border-border/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{outcome.label}</p>
                  <span className={`px-2 py-0.5 text-[10px] rounded-full border ${PROBABILITY_COLORS[outcome.probability] || PROBABILITY_COLORS['Medium']}`}>
                    {outcome.probability}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{outcome.description}</p>

                {outcome.keyActions.length > 0 && (
                  <ul className="text-xs space-y-0.5">
                    {outcome.keyActions.map((action, j) => (
                      <li key={j} className="flex gap-1.5">
                        <span className="text-primary shrink-0">→</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {outcome.risks.length > 0 && (
                  <ul className="text-xs space-y-0.5">
                    {outcome.risks.map((risk, j) => (
                      <li key={j} className="flex gap-1.5 text-red-400">
                        <span className="shrink-0">!</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {outcome.sourceNotes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {outcome.sourceNotes.map((note, j) => (
                      <span key={j} className="text-[10px] italic text-muted-foreground/70">
                        "{note}"
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Recommendation */}
            {result.recommendation && (
              <div className="p-3 border border-primary/20 bg-primary/5 rounded-lg">
                <p className="text-xs font-semibold text-primary mb-0.5">Recommendation</p>
                <p className="text-sm">{result.recommendation}</p>
              </div>
            )}

            {/* Notes to review */}
            {result.notesToReview.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1.5">Notes to Review</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.notesToReview.map((note, i) => (
                    <a
                      key={i}
                      href={`/knowledge?search=${encodeURIComponent(note)}`}
                      className="px-2 py-0.5 text-[10px] rounded bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                    >
                      {note}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
