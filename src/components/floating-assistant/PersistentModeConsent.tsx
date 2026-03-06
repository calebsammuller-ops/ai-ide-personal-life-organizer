'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Eye, Mic, X, Check } from 'lucide-react'

interface PersistentModeConsentProps {
  onAccept: (settings: ConsentSettings) => void
  onDecline: () => void
}

export interface ConsentSettings {
  floatingAssistant: boolean
  contextAwareness: boolean
  backgroundVoice: boolean
}

export function PersistentModeConsent({ onAccept, onDecline }: PersistentModeConsentProps) {
  const [settings, setSettings] = useState<ConsentSettings>({
    floatingAssistant: true,
    contextAwareness: true,
    backgroundVoice: false,
  })

  const toggles = [
    {
      key: 'floatingAssistant' as const,
      icon: <Shield className="h-5 w-5 text-purple-400" />,
      title: 'Floating Assistant',
      description: 'A small bubble that persists across all pages for quick access to your AI assistant.',
      canSee: 'A persistent overlay on your screen',
      cannotSee: 'Other apps, your device files, or anything outside this app',
    },
    {
      key: 'contextAwareness' as const,
      icon: <Eye className="h-5 w-5 text-blue-400" />,
      title: 'Context Awareness',
      description: 'AI knows which page you\'re on and what content is visible, so responses are more relevant.',
      canSee: 'Current page name, visible items (tasks, events), your selected items',
      cannotSee: 'Your screen, camera, microphone (unless voice mode), other apps, or system data',
    },
    {
      key: 'backgroundVoice' as const,
      icon: <Mic className="h-5 w-5 text-green-400" />,
      title: 'Background Voice',
      description: 'Voice conversations continue when you switch to another app (iOS only).',
      canSee: 'Your voice during active conversations only',
      cannotSee: 'Anything when voice mode is off — no always-on listening',
    },
  ]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-md rounded-2xl border border-purple-500/20 bg-zinc-900 p-6 shadow-2xl shadow-purple-500/10"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-purple-400" />
              <h2 className="text-lg font-bold text-white">AI Assistant Settings</h2>
            </div>
            <button
              onClick={onDecline}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mb-5 text-sm text-zinc-400">
            Choose how your AI assistant works. You can change these anytime in Settings.
          </p>

          <div className="space-y-4">
            {toggles.map((toggle) => (
              <div
                key={toggle.key}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {toggle.icon}
                    <span className="text-sm font-medium text-white">{toggle.title}</span>
                  </div>
                  <button
                    onClick={() =>
                      setSettings((s) => ({ ...s, [toggle.key]: !s[toggle.key] }))
                    }
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      settings[toggle.key] ? 'bg-purple-500' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                        settings[toggle.key] ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <p className="mb-2 text-xs text-zinc-400">{toggle.description}</p>
                <div className="space-y-1 text-xs">
                  <p className="text-green-400/80">
                    <Check className="mr-1 inline h-3 w-3" />
                    Can see: {toggle.canSee}
                  </p>
                  <p className="text-red-400/80">
                    <X className="mr-1 inline h-3 w-3" />
                    Cannot see: {toggle.cannotSee}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onDecline}
              className="flex-1 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
            >
              Skip for now
            </button>
            <button
              onClick={() => onAccept(settings)}
              className="flex-1 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-500"
            >
              Enable Assistant
            </button>
          </div>

          <p className="mt-3 text-center text-xs text-zinc-500">
            All data stays on your device and Supabase account. No third-party sharing.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
