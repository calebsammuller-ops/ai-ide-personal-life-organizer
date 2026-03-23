'use client'

import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import { activateLockIn } from '@/state/slices/lockInSlice'
import { closeModal } from '@/state/slices/uiSlice'
import { selectAllNotes } from '@/state/slices/knowledgeSlice'
import { cn } from '@/lib/utils'

const DURATIONS = [3, 7, 14]

export function LockInModal() {
  const dispatch = useAppDispatch()
  const notes = useAppSelector(selectAllNotes)
  const [step, setStep] = useState(1)
  const [focus, setFocus] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [duration, setDuration] = useState(7)

  // Collect top 8 tags from notes
  const tagCounts: Record<string, number> = {}
  notes.forEach(n => (n.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1 }))
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t)

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const handleConfirm = () => {
    if (!focus.trim()) return
    dispatch(activateLockIn({ focus: focus.trim(), allowedTags: selectedTags, durationDays: duration }))
    dispatch(closeModal())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-80 border border-primary/40 bg-background rounded-sm p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-4 bg-primary" />
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
            {step === 1 ? 'Define Your Focus' : 'Set Duration'}
          </p>
        </div>

        {step === 1 && (
          <>
            <div>
              <p className="text-[9px] font-mono text-muted-foreground/50 mb-2">
                What is the one thing you are building right now?
              </p>
              <input
                autoFocus
                value={focus}
                onChange={e => setFocus(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && focus.trim() && setStep(2)}
                placeholder="e.g. AI startup framework"
                className="w-full bg-muted/20 border border-border/50 rounded-sm px-2 py-1.5 text-xs font-mono text-foreground/90 placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50"
              />
            </div>

            {topTags.length > 0 && (
              <div>
                <p className="text-[9px] font-mono text-muted-foreground/40 mb-1.5">
                  Allowed topic tags (optional):
                </p>
                <div className="flex flex-wrap gap-1">
                  {topTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        'text-[8px] font-mono px-1.5 py-0.5 border rounded-sm transition-colors',
                        selectedTags.includes(tag)
                          ? 'border-primary/60 bg-primary/10 text-primary'
                          : 'border-border/40 text-muted-foreground/50 hover:border-primary/30'
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => dispatch(closeModal())}
                className="flex-1 text-[9px] font-mono text-muted-foreground/40 hover:text-muted-foreground border border-border/30 rounded-sm py-1.5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => focus.trim() && setStep(2)}
                disabled={!focus.trim()}
                className="flex-1 text-[9px] font-mono font-bold text-primary border border-primary/40 rounded-sm py-1.5 hover:bg-primary/10 transition-colors disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <p className="text-[9px] font-mono text-muted-foreground/50 mb-1">Focus:</p>
              <p className="text-xs font-mono font-bold text-primary">{focus}</p>
            </div>

            <div>
              <p className="text-[9px] font-mono text-muted-foreground/40 mb-2">Duration:</p>
              <div className="flex gap-2">
                {DURATIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={cn(
                      'flex-1 text-[9px] font-mono py-2 border rounded-sm transition-colors',
                      duration === d
                        ? 'border-primary/60 bg-primary/10 text-primary font-bold'
                        : 'border-border/40 text-muted-foreground/50 hover:border-primary/30'
                    )}
                  >
                    {d} days
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[8px] font-mono text-muted-foreground/30 leading-relaxed">
              Activating will darken the UI and restrict AI guidance to your focus topic.
            </p>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setStep(1)}
                className="flex-1 text-[9px] font-mono text-muted-foreground/40 hover:text-muted-foreground border border-border/30 rounded-sm py-1.5 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 text-[9px] font-mono font-bold text-primary border border-primary/60 rounded-sm py-1.5 hover:bg-primary/10 transition-colors"
              >
                Activate →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
