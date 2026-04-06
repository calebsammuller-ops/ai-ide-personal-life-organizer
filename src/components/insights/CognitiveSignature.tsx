'use client'

import { useAppSelector } from '@/state/hooks'
import { selectCognitiveMirrorData } from '@/state/slices/cognitiveMirrorSlice'

export function CognitiveSignature() {
  const data = useAppSelector(selectCognitiveMirrorData)
  if (!data) return null

  const bias = data.thinkingBiases?.[0] || 'Detecting...'
  const strength = data.strengthSummary
    ? data.strengthSummary.split(' ').slice(0, 8).join(' ')
    : null

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/20">
        <div className="w-0.5 h-3 bg-primary" />
        <p className="text-[10px] font-semibold text-primary/70">Cognitive Signature</p>
      </div>
      <div className="p-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/40 w-14">Pattern</span>
          <span className="text-[10px] text-primary">{data.dominantStyle}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/40 w-14">Bias</span>
          <span className="text-[10px] text-foreground/70">{bias}</span>
        </div>
        {strength && (
          <div className="flex items-start gap-2">
            <span className="text-[10px] text-muted-foreground/40 w-14 shrink-0 pt-0.5">Strength</span>
            <span className="text-[10px] text-foreground/70 leading-tight">{strength}</span>
          </div>
        )}
      </div>
    </div>
  )
}
