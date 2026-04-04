'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useMotionContext } from '@/providers/MotionProvider'
import type { AvatarState } from '@/lib/motion'
import { TacticalMascot } from '@/components/ui/TacticalMascot'
import type { MascotMood } from '@/components/ui/TacticalMascot'

interface FloatingBubbleProps {
  hasNotification?: boolean
  isTyping?: boolean
  onTap: () => void
  dragHandlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
    onMouseDown: (e: React.MouseEvent) => void
  }
  hasMoved: React.MutableRefObject<boolean>
}

const AVATAR_MOOD: Record<AvatarState, MascotMood> = {
  neutral: 'idle',
  attentive: 'greeting',
  focused: 'thinking',
  concerned: 'warning',
  still: 'idle',
}

const AVATAR_GLOW: Record<AvatarState, string> = {
  neutral: 'from-primary/30 to-violet-700/30',
  attentive: 'from-primary/50 to-violet-600/50',
  focused: 'from-violet-600/40 to-indigo-700/40',
  concerned: 'from-amber-500/50 to-violet-500/50',
  still: 'from-muted/10 to-muted/10',
}

const AVATAR_PULSE: Record<AvatarState, { scale: number[]; opacity: number[]; duration: number }> = {
  neutral: { scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4], duration: 3 },
  attentive: { scale: [1, 1.2, 1], opacity: [0.5, 0.7, 0.5], duration: 2.5 },
  focused: { scale: [1, 1.1, 1], opacity: [0.4, 0.5, 0.4], duration: 2 },
  concerned: { scale: [1, 1.1, 1], opacity: [0.5, 0.7, 0.5], duration: 2 },
  still: { scale: [1, 1, 1], opacity: [0.15, 0.15, 0.15], duration: 5 },
}

export function FloatingBubble({
  hasNotification = false,
  isTyping = false,
  onTap,
  dragHandlers,
  hasMoved,
}: FloatingBubbleProps) {
  const { avatarState } = useMotionContext()
  const glow = AVATAR_GLOW[avatarState]
  const pulse = AVATAR_PULSE[avatarState]
  const mood = AVATAR_MOOD[avatarState]

  const handleClick = () => {
    if (!hasMoved.current) {
      onTap()
    }
  }

  return (
    <motion.div
      className="relative w-14 h-14 cursor-pointer select-none touch-none"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      {...dragHandlers}
    >
      {/* Glow ring */}
      <motion.div
        className={cn('absolute inset-0 rounded-sm bg-gradient-to-br blur-md', glow)}
        animate={{ scale: pulse.scale, opacity: pulse.opacity }}
        transition={{ duration: pulse.duration, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Main bubble */}
      <div className="relative w-14 h-14 rounded-sm overflow-hidden border border-primary/30 shadow-lg shadow-primary/20 bg-background flex items-center justify-center">
        <TacticalMascot mood={isTyping ? 'thinking' : mood} size="md" />

        {/* Thinking dots */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-1 left-0 right-0 flex justify-center gap-0.5"
            >
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-1 h-1 rounded-sm bg-primary"
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Notification badge */}
      <AnimatePresence>
        {hasNotification && !isTyping && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className={cn(
              'absolute -top-0.5 -right-0.5 w-4 h-4 rounded-sm',
              'bg-primary border-2 border-background',
              'flex items-center justify-center'
            )}
          >
            <motion.div
              className="w-2 h-2 rounded-sm bg-violet-300"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
