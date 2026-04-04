'use client'

import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'

export default function InsightsLoading() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-[calc(100vh-3rem)] md:h-screen p-3 md:p-4 pb-16 md:pb-4 gap-4 overflow-hidden"
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-8 w-24" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map(i => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="border border-border/30 bg-card p-4"
          >
            <Skeleton className="h-4 w-32 mb-3" />
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-2 mt-3">
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-7 w-16" />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
