'use client'

import { motion } from 'framer-motion'
import { TacticalMascot } from './TacticalMascot'

interface LoadingProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  showMascot?: boolean
}

export function Loading({ message = 'Loading...', size = 'md', showMascot = true }: LoadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center gap-4 py-12"
    >
      {showMascot ? (
        <TacticalMascot mood="thinking" size={size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md'} />
      ) : (
        <>
          <LoadingSpinner size={size} />
          <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
        </>
      )}
    </motion.div>
  )
}

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  return (
    <div className={`relative ${sizeClasses[size]}`}>
      {/* Outer ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-primary/20"
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      />
      {/* Inner ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      {/* Center dot */}
      <motion.div
        className="absolute inset-0 m-auto w-2 h-2 bg-primary rounded-full"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      />
    </div>
  )
}

export function LoadingDots() {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-primary rounded-full"
          animate={{ y: [0, -8, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  )
}

export function LoadingPulse({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`bg-muted rounded ${className}`}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
  )
}

// Skeleton loaders for different content types
export function SkeletonCard() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-lg border bg-card p-4 space-y-3"
    >
      <LoadingPulse className="h-4 w-3/4" />
      <LoadingPulse className="h-3 w-1/2" />
      <div className="flex gap-2 pt-2">
        <LoadingPulse className="h-8 w-20" />
        <LoadingPulse className="h-8 w-20" />
      </div>
    </motion.div>
  )
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center gap-3 p-3 rounded-lg border"
        >
          <LoadingPulse className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <LoadingPulse className="h-4 w-3/4" />
            <LoadingPulse className="h-3 w-1/2" />
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
          className="p-4 rounded-lg border bg-card"
        >
          <LoadingPulse className="h-8 w-16 mb-2" />
          <LoadingPulse className="h-4 w-24" />
        </motion.div>
      ))}
    </div>
  )
}

// Full page loading with mascot
export function PageLoading({ message = 'Loading your dashboard...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <TacticalMascot mood="thinking" size="lg" />
      </motion.div>
    </div>
  )
}
