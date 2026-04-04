'use client'

import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'

export default function KnowledgeLoading() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-screen flex overflow-hidden bg-background"
    >
      {/* Left panel skeleton */}
      <div className="flex w-full md:w-72 flex-col border-r border-border/30 bg-background/50 p-3 gap-2">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-6" />
        </div>
        <Skeleton className="h-8 w-full mb-2" />
        <div className="flex gap-1 mb-3 overflow-hidden">
          {[0, 1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-6 w-16 shrink-0" />
          ))}
        </div>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="border border-border/20 p-2.5"
          >
            <Skeleton className="h-4 w-3/4 mb-1.5" />
            <Skeleton className="h-3 w-1/2" />
          </motion.div>
        ))}
      </div>

      {/* Center panel skeleton (hidden on mobile) */}
      <div className="hidden md:flex flex-1 flex-col overflow-hidden p-4 gap-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </motion.div>
  )
}
