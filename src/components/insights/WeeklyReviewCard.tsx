'use client'

import { CalendarDays, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAppSelector } from '@/state/hooks'
import {
  selectWeeklyReviewData,
  selectWeeklyReviewLoading,
  selectWeeklyReviewGeneratedAt,
} from '@/state/slices/weeklyReviewSlice'
import { cn } from '@/lib/utils'

export function WeeklyReviewCard() {
  const data = useAppSelector(selectWeeklyReviewData)
  const loading = useAppSelector(selectWeeklyReviewLoading)
  const generatedAt = useAppSelector(selectWeeklyReviewGeneratedAt)

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-indigo-500" />
            Weekly Review
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating your weekly review...
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const generatedAgo = generatedAt
    ? (() => {
        const diff = Date.now() - new Date(generatedAt).getTime()
        const h = Math.floor(diff / 3600000)
        if (h < 1) return 'just now'
        if (h < 24) return `${h}h ago`
        return `${Math.floor(h / 24)}d ago`
      })()
    : null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4 text-indigo-500" />
          Weekly Review
          {data.period && (
            <Badge variant="secondary" className="ml-1 text-[10px] font-normal">
              {data.period}
            </Badge>
          )}
          {generatedAgo && (
            <span className="ml-auto text-[10px] text-muted-foreground/50 font-normal">
              {generatedAgo}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Top Themes */}
        {data.topThemes.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-1.5">This Week's Themes</p>
            <div className="flex flex-wrap gap-1.5">
              {data.topThemes.map((theme, i) => (
                <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                  {theme}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Deepest Insight */}
        {data.deepestInsight && (
          <blockquote className="border-l-2 border-indigo-500/40 pl-3">
            <p className="text-sm italic text-muted-foreground">{data.deepestInsight}</p>
          </blockquote>
        )}

        {/* Momentum */}
        {data.momentum && (
          <div className="p-3 border border-green-500/20 bg-green-500/5 rounded-lg">
            <p className="text-xs font-semibold text-green-400 mb-0.5">Momentum</p>
            <p className="text-sm">{data.momentum}</p>
          </div>
        )}

        {/* Notable Connections */}
        {data.notableConnections.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-1.5">Notable Connections</p>
            <ol className="space-y-1">
              {data.notableConnections.map((conn, i) => (
                <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                  <span className="text-indigo-400 shrink-0 font-medium">{i + 1}.</span>
                  <span>{conn}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Next Week Focus */}
        {data.nextWeekFocus && (
          <div className="p-3 border border-amber-500/30 bg-amber-500/5 rounded-lg">
            <p className="text-xs font-semibold text-amber-500 mb-0.5">Next Week Focus</p>
            <p className="text-sm">{data.nextWeekFocus}</p>
          </div>
        )}

        {/* Question to Sit With */}
        {data.questionToSitWith && (
          <div className="p-3 border border-purple-500/20 bg-purple-500/5 rounded-lg">
            <p className="text-xs font-semibold text-purple-400 mb-1">Sit with this:</p>
            <p className="text-sm italic">{data.questionToSitWith}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
