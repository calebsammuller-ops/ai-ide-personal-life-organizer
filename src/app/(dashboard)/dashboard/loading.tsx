'use client'

import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-[calc(100vh-3rem)] md:h-screen p-3 md:p-4 pb-16 md:pb-4 gap-3 overflow-hidden"
    >
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="w-0.5 h-5" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>

      {/* Stats strip skeleton */}
      <div className="grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map(i => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="border border-border/30 bg-card p-2"
          >
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-6 w-10" />
          </motion.div>
        ))}
      </div>

      {/* Quick actions skeleton */}
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map(i => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>

      {/* Identity card skeleton */}
      <div className="border border-border/30 bg-card p-3">
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-6 w-20 mb-2" />
        <div className="flex gap-1">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-14" />
        </div>
      </div>

      {/* Content cards skeleton */}
      {[0, 1].map(i => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + i * 0.1 }}
          className="border border-border/30 bg-card p-3"
        >
          <Skeleton className="h-3 w-32 mb-3" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </motion.div>
      ))}
    </motion.main>
  )
}
