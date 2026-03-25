'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppSelector } from '@/state/hooks'
import { selectMissedCount, selectIgnoredCount } from '@/state/slices/nextMoveSlice'
import { selectCognitiveState } from '@/state/slices/cognitiveStateSlice'
import { selectLockInDriftCount } from '@/state/slices/lockInSlice'
import { selectAllNotes } from '@/state/slices/knowledgeSlice'

function computeObservation(
  missedCount: number,
  ignoredCount: number,
  cogState: string,
  driftCount: number,
  notesCount: number,
): string | null {
  if (missedCount > 3) return "You've started more than you've finished today."
  if (ignoredCount > 3) return "You tend to pause right before executing."
  if (cogState === 'drifting') return "Your focus has shifted several times recently."
  if (driftCount > 2) return "You've opened topics outside your lock-in focus."
  if (notesCount > 0 && notesCount % 5 === 0) return `${notesCount} ideas captured. The pattern is forming.`
  return null
}

export function MicroObservation() {
  const missedCount = useAppSelector(selectMissedCount)
  const ignoredCount = useAppSelector(selectIgnoredCount)
  const cogState = useAppSelector(selectCognitiveState)
  const driftCount = useAppSelector(selectLockInDriftCount)
  const notes = useAppSelector(selectAllNotes)
  const [obs, setObs] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      const msg = computeObservation(missedCount, ignoredCount, cogState, driftCount, notes.length)
      if (msg) {
        setObs(msg)
        setVisible(true)
        setTimeout(() => setVisible(false), 5000)
      }
    }, 75000)
    return () => clearInterval(interval)
  }, [missedCount, ignoredCount, cogState, driftCount, notes.length])

  return (
    <AnimatePresence>
      {visible && obs && (
        <motion.div
          className="fixed bottom-6 left-6 z-30 pointer-events-none"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-[9px] font-mono text-muted-foreground/40 max-w-[220px] leading-relaxed">
            {obs}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
