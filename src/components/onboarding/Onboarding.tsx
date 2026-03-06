'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Check, Sparkles, Target, Brain, Utensils, Calendar } from 'lucide-react'
import { TacticalMascot } from '@/components/ui/TacticalMascot'
import { Button } from '@/components/ui/button'
import { AnimatedProgress } from '@/components/ui/animated'

interface OnboardingProps {
  onComplete: () => void
  userName?: string
}

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to LockIN',
    description: 'Your AI-powered personal life organizer. Let me help you build better habits, plan your days, and achieve your goals.',
    icon: Sparkles,
    mascotMood: 'greeting' as const,
    mascotMessage: 'Hey there! I\'m excited to help you!',
  },
  {
    id: 'habits',
    title: 'Build Better Habits',
    description: 'Track your daily habits with smart reminders. I\'ll help you stay consistent and celebrate your streaks!',
    icon: Target,
    mascotMood: 'encouraging' as const,
    mascotMessage: 'Habits make the difference!',
  },
  {
    id: 'planning',
    title: 'Smart Daily Planning',
    description: 'I\'ll help you organize your calendar, schedule tasks at optimal times, and ensure you never miss what matters.',
    icon: Calendar,
    mascotMood: 'thinking' as const,
    mascotMessage: 'Let\'s plan together!',
  },
  {
    id: 'meals',
    title: 'Meal Planning & Tracking',
    description: 'Scan your food, track nutrition, and plan healthy meals. I can recognize what you\'re eating with just a photo!',
    icon: Utensils,
    mascotMood: 'idle' as const,
    mascotMessage: 'Healthy eating made easy!',
  },
  {
    id: 'assistant',
    title: 'Your AI Assistant',
    description: 'Chat with me anytime! I can help you add tasks, check your schedule, give advice, or just have a conversation.',
    icon: Brain,
    mascotMood: 'greeting' as const,
    mascotMessage: 'Ask me anything!',
  },
]

export function Onboarding({ onComplete, userName }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(1)

  const step = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1
  const progress = ((currentStep + 1) / steps.length) * 100

  const goNext = () => {
    if (isLastStep) {
      onComplete()
    } else {
      setDirection(1)
      setCurrentStep((prev) => prev + 1)
    }
  }

  const goPrev = () => {
    setDirection(-1)
    setCurrentStep((prev) => Math.max(0, prev - 1))
  }

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  }

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="h-full flex flex-col">
        {/* Progress bar */}
        <div className="p-4">
          <AnimatedProgress value={progress} className="max-w-md mx-auto" />
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step.id}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="max-w-lg text-center"
            >
              {/* Icon and Mascot */}
              <div className="relative mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="w-24 h-24 mx-auto bg-primary/10 border border-primary/20 rounded-sm flex items-center justify-center mb-6"
                >
                  <step.icon className="w-12 h-12 text-primary" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <TacticalMascot
                    mood={step.mascotMood}
                    size="lg"
                  />
                </motion.div>
              </div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-3xl font-bold mb-4"
              >
                {currentStep === 0 && userName
                  ? `Welcome, ${userName}!`
                  : step.title}
              </motion.h2>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg text-muted-foreground leading-relaxed"
              >
                {step.description}
              </motion.p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="p-6">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={goPrev}
              disabled={currentStep === 0}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>

            {/* Step indicators */}
            <div className="flex gap-2">
              {steps.map((_, i) => (
                <motion.div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentStep
                      ? 'bg-primary'
                      : i < currentStep
                        ? 'bg-primary/50'
                        : 'bg-muted'
                  }`}
                  animate={i === currentStep ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
              ))}
            </div>

            <Button onClick={goNext} className="gap-2">
              {isLastStep ? (
                <>
                  Get Started
                  <Check className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>

          {/* Skip button */}
          {!isLastStep && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              onClick={onComplete}
              className="block mx-auto mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip intro
            </motion.button>
          )}
        </div>
      </div>
    </div>
  )
}

// Mini onboarding tooltip for specific features
interface FeatureTooltipProps {
  show: boolean
  onDismiss: () => void
  title: string
  description: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export function FeatureTooltip({
  show,
  onDismiss,
  title,
  description,
  position = 'bottom',
}: FeatureTooltipProps) {
  const positions = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={`absolute ${positions[position]} z-50 w-64`}
        >
          <div className="bg-primary text-primary-foreground p-4 rounded-lg shadow-lg">
            <div className="flex items-start gap-3">
              <TacticalMascot mood="greeting" size="sm" />
              <div className="flex-1">
                <h4 className="font-semibold mb-1">{title}</h4>
                <p className="text-sm text-primary-foreground/80">{description}</p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="mt-3 text-sm underline hover:no-underline"
            >
              Got it!
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
