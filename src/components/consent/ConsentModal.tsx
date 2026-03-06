'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Brain, Calendar, Eye, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  selectShowConsentModal,
  selectPendingConsentType,
  updateConsent,
  dismissConsent,
} from '@/state/slices/consentSlice'

const consentInfo: Record<string, { title: string; description: string; icon: React.ElementType; details: string[] }> = {
  ai_data_access: {
    title: 'AI Data Access',
    description: 'Allow the AI assistant to access your data to provide personalized help.',
    icon: Brain,
    details: [
      'Read your calendar events to suggest schedules',
      'View your habits to track progress and offer tips',
      'Access meal plans for nutrition advice',
      'Review your thoughts for better organization',
    ],
  },
  google_calendar: {
    title: 'Google Calendar',
    description: 'Connect your Google Calendar to import events into the app.',
    icon: Calendar,
    details: [
      'Import your existing calendar events',
      'Display Google events alongside your app events',
      'Read-only access — we never modify your Google Calendar',
      'You can disconnect at any time in Settings',
    ],
  },
  data_learning: {
    title: 'Pattern Learning',
    description: 'Allow the AI to learn from your activity to improve suggestions over time.',
    icon: Eye,
    details: [
      'Analyze your productivity patterns',
      'Learn your preferred schedule and routines',
      'Remember your preferences for better suggestions',
      'All data stays private to your account',
    ],
  },
}

export function ConsentModal() {
  const dispatch = useAppDispatch()
  const showModal = useAppSelector(selectShowConsentModal)
  const pendingType = useAppSelector(selectPendingConsentType)

  const info = pendingType ? consentInfo[pendingType] : null

  const handleAllow = () => {
    if (pendingType) {
      dispatch(updateConsent({ consentType: pendingType, granted: true }))
    }
  }

  const handleDeny = () => {
    dispatch(dismissConsent())
  }

  if (!info) return null

  const Icon = info.icon

  return (
    <AnimatePresence>
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 20 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-blue-600/20 to-purple-600/20 p-6 border-b border-zinc-800">
              <button
                onClick={handleDeny}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                  className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"
                >
                  <Icon className="h-6 w-6 text-white" />
                </motion.div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{info.title}</h3>
                  <p className="text-sm text-zinc-400">{info.description}</p>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="p-6 space-y-3">
              <p className="text-xs text-zinc-500 uppercase font-medium tracking-wide">What this allows:</p>
              {info.details.map((detail, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                  className="flex items-start gap-3"
                >
                  <Shield className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-zinc-300">{detail}</span>
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-6 pt-0 flex gap-3">
              <Button
                variant="outline"
                onClick={handleDeny}
                className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Not Now
              </Button>
              <Button
                onClick={handleAllow}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              >
                Allow
              </Button>
            </div>

            <p className="px-6 pb-4 text-xs text-zinc-500 text-center">
              You can change this anytime in Settings → Privacy & Data
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
