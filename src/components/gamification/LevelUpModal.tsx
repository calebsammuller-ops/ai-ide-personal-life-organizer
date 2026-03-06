'use client'

import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  selectShowLevelUpModal,
  selectLevelUpData,
  dismissLevelUpModal,
} from '@/state/slices/gamificationSlice'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import confetti from 'canvas-confetti'

export function LevelUpModal() {
  const dispatch = useAppDispatch()
  const show = useAppSelector(selectShowLevelUpModal)
  const levelUpData = useAppSelector(selectLevelUpData)
  const [animationStage, setAnimationStage] = useState(0)

  useEffect(() => {
    if (show && levelUpData) {
      // Trigger confetti animation
      const duration = 3 * 1000
      const animationEnd = Date.now() + duration
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min
      }

      const interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now()

        if (timeLeft <= 0) {
          return clearInterval(interval)
        }

        const particleCount = 50 * (timeLeft / duration)

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        })
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        })
      }, 250)

      // Animation stages
      setTimeout(() => setAnimationStage(1), 300)
      setTimeout(() => setAnimationStage(2), 800)
      setTimeout(() => setAnimationStage(3), 1300)

      return () => clearInterval(interval)
    }
  }, [show, levelUpData])

  const handleClose = () => {
    setAnimationStage(0)
    dispatch(dismissLevelUpModal())
  }

  if (!levelUpData) return null

  const { oldLevel, newLevel } = levelUpData

  return (
    <Dialog open={show} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {animationStage >= 1 ? '🎉 Level Up! 🎉' : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="py-8 space-y-6">
          {/* Old Level -> New Level */}
          <div className="flex items-center justify-center gap-4">
            <div
              className={`transition-all duration-500 ${
                animationStage >= 2 ? 'opacity-50 scale-75' : 'opacity-100'
              }`}
            >
              <div className="text-4xl mb-2">{oldLevel.badge}</div>
              <p className="text-sm text-muted-foreground">Level {oldLevel.level}</p>
            </div>

            <div
              className={`text-2xl transition-all duration-500 ${
                animationStage >= 2 ? 'opacity-100' : 'opacity-0'
              }`}
            >
              →
            </div>

            <div
              className={`transition-all duration-500 ${
                animationStage >= 2
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-50'
              }`}
            >
              <div className="text-6xl mb-2 animate-bounce">{newLevel.badge}</div>
              <p className="font-bold text-lg">Level {newLevel.level}</p>
              <p className="text-sm text-primary">{newLevel.name}</p>
            </div>
          </div>

          {/* Congratulations message */}
          <div
            className={`transition-all duration-500 ${
              animationStage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <p className="text-lg font-medium">Congratulations!</p>
            <p className="text-muted-foreground text-sm mt-2">
              You&apos;ve reached <span className="font-semibold text-primary">{newLevel.name}</span> status.
              Keep up the amazing work!
            </p>
          </div>
        </div>

        <Button onClick={handleClose} className="w-full">
          Continue
        </Button>
      </DialogContent>
    </Dialog>
  )
}
