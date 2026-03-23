'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface RewardItem { id: number; label: string }

// Global ref for triggering from outside
let _trigger: ((label: string) => void) | null = null

export function triggerMicroReward(label: string) {
  if (_trigger) _trigger(label)
}

export function MicroReward() {
  const [items, setItems] = useState<RewardItem[]>([])
  const counterRef = useRef(0)

  const trigger = useCallback((label: string) => {
    const id = ++counterRef.current
    setItems(prev => [...prev, { id, label }])
    setTimeout(() => {
      setItems(prev => prev.filter(item => item.id !== id))
    }, 1500)
  }, [])

  useEffect(() => {
    _trigger = trigger
    return () => { _trigger = null }
  }, [trigger])

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center gap-1">
      <AnimatePresence>
        {items.map(item => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 0, scale: 0.8 }}
            animate={{ opacity: 1, y: -20, scale: 1 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="text-[10px] font-mono font-bold text-primary bg-primary/10 border border-primary/30 px-2 py-0.5 rounded-sm"
          >
            {item.label}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
