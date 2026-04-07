'use client'

import { useAppDispatch, useAppSelector } from '@/state/hooks'
import { selectLockInActive, selectLockInFocus, selectLockInStartedAt, selectLockInDurationDays, selectLockInProgress, deactivateLockIn } from '@/state/slices/lockInSlice'

export function LockInBanner() {
  const dispatch = useAppDispatch()
  const active = useAppSelector(selectLockInActive)
  const focus = useAppSelector(selectLockInFocus)
  const startedAt = useAppSelector(selectLockInStartedAt)
  const durationDays = useAppSelector(selectLockInDurationDays)
  const progress = useAppSelector(selectLockInProgress)

  if (!active || !focus) return null

  const elapsed = startedAt
    ? Math.floor((Date.now() - new Date(startedAt).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 1

  const total = progress.ideasExpanded + progress.connectionsMade + progress.notesCreated

  return (
    <div className="w-full flex items-center justify-between px-4 py-1 bg-primary/5 border-b border-primary/20 text-[9px]">
      <span className="text-primary/70">
        🔒 LOCK-IN · Focus: <span className="font-bold text-primary">{focus}</span> · Day {elapsed}/{durationDays} · {total} actions
      </span>
      <button
        onClick={() => dispatch(deactivateLockIn())}
        className="text-muted-foreground/40 hover:text-destructive/60 transition-colors"
      >
        [EXIT]
      </button>
    </div>
  )
}
