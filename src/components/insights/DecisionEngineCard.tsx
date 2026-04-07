'use client'

import { useState } from 'react'
import { Scale, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { DecisionResult } from '@/types/knowledge'

const RISK_STYLES: Record<string, string> = {
  low: 'bg-green-500/15 text-green-400 border border-green-500/30',
  medium: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  high: 'bg-red-500/15 text-red-400 border border-red-500/30',
}

export function DecisionEngineCard() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DecisionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedOption, setExpandedOption] = useState<number | null>(null)

  const handleAnalyze = async () => {
    if (!question.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    setExpandedOption(null)
    try {
      const res = await fetch('/api/knowledge/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      if (!res.ok) throw new Error('Decision analysis failed')
      const json = await res.json()
      setResult(json.data)
      setExpandedOption(0)
    } catch {
      setError('Failed to analyze decision. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="rounded-xl card-gradient-blue border-l-[3px] border-l-blue-500">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="h-4 w-4 text-blue-500" />
          Decision Engine
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <textarea
            className="w-full min-h-[80px] px-3 py-2 text-sm rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
            placeholder="What decision are you facing? e.g. 'Should I go deep on AI tooling or pivot to B2B SaaS?'"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAnalyze()
            }}
          />
          <Button
            className="w-full"
            onClick={handleAnalyze}
            disabled={loading || !question.trim()}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</>
            ) : (
              <><Scale className="h-4 w-4 mr-2" />Analyze Decision</>
            )}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {result && (
          <div className="space-y-4">
            {/* Recommendation hero */}
            {result.recommendation && (
              <div className="p-3 border border-amber-500/30 bg-amber-500/5 rounded-lg">
                <p className="text-xs font-semibold text-amber-500 mb-1">Recommendation</p>
                <p className="text-sm">{result.recommendation}</p>
              </div>
            )}

            {/* Options */}
            {result.options.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Options</p>
                {result.options.map((opt, i) => (
                  <div key={i} className="border border-border/50 rounded-lg overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedOption(expandedOption === i ? null : i)}
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{opt.option}</p>
                        <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${RISK_STYLES[opt.riskLevel] || RISK_STYLES['medium']}`}>
                          {opt.riskLevel} risk
                        </span>
                      </div>
                      {expandedOption === i
                        ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      }
                    </button>

                    {expandedOption === i && (
                      <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-2">
                        {/* Pros */}
                        {opt.pros.length > 0 && (
                          <ul className="space-y-0.5">
                            {opt.pros.map((pro, j) => (
                              <li key={j} className="flex gap-1.5 text-xs text-green-400">
                                <span className="shrink-0">✓</span>
                                <span>{pro}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {/* Cons */}
                        {opt.cons.length > 0 && (
                          <ul className="space-y-0.5">
                            {opt.cons.map((con, j) => (
                              <li key={j} className="flex gap-1.5 text-xs text-red-400">
                                <span className="shrink-0">✗</span>
                                <span>{con}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {/* Aligned notes */}
                        {opt.alignsWithNotes.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {opt.alignsWithNotes.map((note, j) => (
                              <span key={j} className="text-[10px] italic text-muted-foreground/60 bg-muted/30 px-1.5 py-0.5 rounded">
                                "{note}"
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Key Factors + Blind Spots */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {result.keyFactors.length > 0 && (
                <div className="p-3 border border-border/50 rounded-lg">
                  <p className="text-xs font-semibold mb-1.5">Key Factors</p>
                  <ul className="space-y-0.5">
                    {result.keyFactors.map((f, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="text-primary shrink-0">•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.blindSpots.length > 0 && (
                <div className="p-3 border border-orange-500/20 bg-orange-500/5 rounded-lg">
                  <p className="text-xs font-semibold mb-1.5 text-orange-400">Blind Spots</p>
                  <ul className="space-y-0.5">
                    {result.blindSpots.map((b, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="text-orange-400 shrink-0">!</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Next Step */}
            {result.nextStep && (
              <div className="p-3 border border-primary/20 bg-primary/5 rounded-lg">
                <p className="text-xs font-semibold text-primary mb-0.5">Next Step (48h)</p>
                <p className="text-sm">{result.nextStep}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
