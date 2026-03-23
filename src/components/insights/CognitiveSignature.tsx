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
    <div className="rounded-sm border border-primary/20 bg-primary/5">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/20">
        <div className="w-0.5 h-3 bg-primary" />
        <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-primary/70">Cognitive Signature</p>
      </div>
      <div className="p-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-mono text-muted-foreground/40 w-14">Pattern</span>
          <span className="text-[9px] font-mono text-primary">{data.dominantStyle}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-mono text-muted-foreground/40 w-14">Bias</span>
          <span className="text-[9px] font-mono text-foreground/70">{bias}</span>
        </div>
        {strength && (
          <div className="flex items-start gap-2">
            <span className="text-[8px] font-mono text-muted-foreground/40 w-14 shrink-0 pt-0.5">Strength</span>
            <span className="text-[9px] font-mono text-foreground/70 leading-tight">{strength}</span>
          </div>
        )}
      </div>
    </div>
  )
}
