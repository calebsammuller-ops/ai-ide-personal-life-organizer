'use client'

import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { TacticalMascot } from './TacticalMascot'

interface CelebrationProps {
  show: boolean
  onComplete?: () => void
  message?: string
  type?: 'confetti' | 'fireworks' | 'stars'
}

export function Celebration({
  show,
  onComplete,
  message = 'Amazing!',
  type = 'confetti',
}: CelebrationProps) {
  const triggerCelebration = useCallback(() => {
    if (type === 'confetti') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'],
      })
    } else if (type === 'fireworks') {
      const duration = 2000
      const animationEnd = Date.now() + duration
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now()
        if (timeLeft <= 0) {
          clearInterval(interval)
          return
        }

        const particleCount = 50 * (timeLeft / duration)
        confetti({
          ...defaults,
          particleCount,
          origin: { x: Math.random(), y: Math.random() - 0.2 },
        })
      }, 250)
    } else if (type === 'stars') {
      confetti({
        particleCount: 50,
        spread: 60,
        shapes: ['star'],
        colors: ['#ffd700', '#ffec8b', '#fff8dc'],
      })
    }

    setTimeout(() => {
      onComplete?.()
    }, 2000)
  }, [type, onComplete])

  useEffect(() => {
    if (show) {
      triggerCelebration()
    }
  }, [show, triggerCelebration])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <motion.div
            initial={{ y: 50 }}
            animate={{ y: 0 }}
            className="text-center"
          >
            <TacticalMascot mood="celebrating" size="lg" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Quick celebration toast
interface CelebrationToastProps {
  show: boolean
  message: string
  xp?: number
  onComplete?: () => void
}

export function CelebrationToast({ show, message, xp, onComplete }: CelebrationToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onComplete?.()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [show, onComplete])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-3 bg-gradient-to-r from-primary to-violet-700 text-white px-4 py-3 rounded-sm shadow-lg border border-primary/30">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: 2 }}
            >
              <TacticalMascot mood="celebrating" size="sm" />
            </motion.div>
            <div>
              <p className="font-medium">{message}</p>
              {xp && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-white/80"
                >
                  +{xp} XP
                </motion.p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Streak celebration
interface StreakCelebrationProps {
  streak: number
  show: boolean
  onComplete?: () => void
}

export function StreakCelebration({ streak, show, onComplete }: StreakCelebrationProps) {
  useEffect(() => {
    if (show && streak > 0) {
      confetti({
        particleCount: streak * 10,
        spread: 60,
        origin: { y: 0.7 },
      })
    }
  }, [show, streak])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onComplete}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center cursor-pointer"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: 'spring', damping: 15 }}
            className="bg-gradient-to-br from-violet-500 to-indigo-600 rounded-3xl p-8 text-center text-white shadow-2xl"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="text-6xl mb-4"
            >
              🔥
            </motion.div>
            <h2 className="text-3xl font-bold mb-2">{streak} Day Streak!</h2>
            <p className="text-white/80">You're on fire! Keep it up!</p>
            <TacticalMascot mood="celebrating" size="lg" className="mt-4" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Level up celebration
interface LevelUpProps {
  level: number
  levelName: string
  show: boolean
  onComplete?: () => void
}

export function LevelUpCelebration({ level, levelName, show, onComplete }: LevelUpProps) {
  useEffect(() => {
    if (show) {
      // Fireworks effect
      const duration = 3000
      const animationEnd = Date.now() + duration

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now()
        if (timeLeft <= 0) {
          clearInterval(interval)
          return
        }

        confetti({
          particleCount: 30,
          spread: 100,
          origin: { x: Math.random(), y: 0.3 },
          colors: ['#ffd700', '#3b82f6', '#8b5cf6'],
        })
      }, 200)

      setTimeout(onComplete, 5000)
    }
  }, [show, onComplete])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0, y: 100 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: -100 }}
            transition={{ type: 'spring', damping: 12 }}
            className="text-center"
          >
            <motion.div
              animate={{
                rotate: [0, 360],
                scale: [1, 1.2, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-violet-400 to-purple-500 rounded-full flex items-center justify-center shadow-2xl"
            >
              <span className="text-5xl font-bold text-white">{level}</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl font-bold text-white mb-2"
            >
              Level Up!
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-2xl text-yellow-400 font-medium mb-6"
            >
              {levelName}
            </motion.p>

            <TacticalMascot mood="celebrating" size="lg" />

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              onClick={onComplete}
              className="mt-6 px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-gray-100 transition-colors"
            >
              Continue
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
