'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

export function SessionFadeIn() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 1400)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  return (
    <motion.div
      className="fixed inset-0 bg-black z-[100] pointer-events-none"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.9, ease: 'easeOut', delay: 0.3 }}
    />
  )
}
