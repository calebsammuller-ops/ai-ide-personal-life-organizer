'use client'

import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'

export default function ThinkLoading() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-[calc(100vh-3rem)] md:h-screen"
    >
      {/* Chat header skeleton */}
      <div className="border-b border-border/30 p-3 flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div>
          <Skeleton className="h-4 w-32 mb-1" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      {/* Messages area skeleton */}
      <div className="flex-1 p-3 space-y-4">
        {/* Welcome skeleton */}
        <div className="flex flex-col items-center pt-8 gap-3">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-4 w-52" />
        </div>

        {/* Action cards skeleton */}
        <div className="grid grid-cols-2 gap-2 mt-4 px-2">
          {[0, 1, 2, 3].map(i => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.06 }}
              className="border border-border/20 p-3"
            >
              <Skeleton className="h-5 w-5 mb-2" />
              <Skeleton className="h-3 w-20" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Input skeleton */}
      <div className="border-t border-border/30 p-3">
        <Skeleton className="h-10 w-full" />
      </div>
    </motion.div>
  )
}
