'use client'

import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useAppSelector } from '@/state/hooks'
import { selectIsTyping } from '@/state/slices/assistantSlice'
import { useDraggable } from '@/hooks/useDraggable'
import { FloatingBubble } from './FloatingBubble'
import { MiniChat } from './MiniChat'
import { PersistentModeConsent, type ConsentSettings } from './PersistentModeConsent'

type FloatingState = 'collapsed' | 'expanded' | 'hidden'

const CONSENT_KEY = 'floating-assistant-consent'
const ENABLED_KEY = 'floating-assistant-enabled'
const CONTEXT_KEY = 'context-awareness-enabled'
const BG_VOICE_KEY = 'background-voice-enabled'

export function FloatingAssistant() {
  const pathname = usePathname()
  const isTyping = useAppSelector(selectIsTyping)
  const [state, setState] = useState<FloatingState>('collapsed')
  const [isEnabled, setIsEnabled] = useState(false)
  const [showConsent, setShowConsent] = useState(false)

  const { position, isDragging, hasMoved, handlers } = useDraggable({
    storageKey: 'floating-assistant-pos',
    edgeSnapping: true,
    elementSize: 56,
  })

  // Load preferences on mount
  useEffect(() => {
    const consentGiven = localStorage.getItem(CONSENT_KEY)
    const enabled = localStorage.getItem(ENABLED_KEY)

    if (consentGiven === null) {
      // First time — show consent dialog
      setShowConsent(true)
    } else if (enabled !== 'false') {
      setIsEnabled(true)
    }
  }, [])

  // Hide on the live-assistant page (it has its own full chat)
  const isAssistantPage = pathname === '/live-assistant'

  // Collapse when navigating to a new page
  useEffect(() => {
    if (state === 'expanded') {
      setState('collapsed')
    }
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBubbleTap = useCallback(() => {
    setState(prev => prev === 'collapsed' ? 'expanded' : 'collapsed')
  }, [])

  const handleClose = useCallback(() => {
    setState('collapsed')
  }, [])

  const handleVoiceMode = useCallback(() => {
    setState('collapsed')
    // Voice mode is handled by the existing VoiceMode overlay via Redux
  }, [])

  const handleConsentAccept = useCallback((settings: ConsentSettings) => {
    localStorage.setItem(CONSENT_KEY, 'true')
    localStorage.setItem(ENABLED_KEY, settings.floatingAssistant ? 'true' : 'false')
    localStorage.setItem(CONTEXT_KEY, settings.contextAwareness ? 'true' : 'false')
    localStorage.setItem(BG_VOICE_KEY, settings.backgroundVoice ? 'true' : 'false')
    setIsEnabled(settings.floatingAssistant)
    setShowConsent(false)
  }, [])

  const handleConsentDecline = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, 'declined')
    localStorage.setItem(ENABLED_KEY, 'false')
    setIsEnabled(false)
    setShowConsent(false)
  }, [])

  // Show consent dialog
  if (showConsent) {
    return (
      <PersistentModeConsent
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
      />
    )
  }

  // Don't render if disabled or on the assistant page
  if (!isEnabled || isAssistantPage) return null

  // Determine panel position relative to bubble
  const isRightSide = typeof window !== 'undefined' && position.x > window.innerWidth / 2
  const isBottomHalf = typeof window !== 'undefined' && position.y > window.innerHeight / 2

  return (
    <div
      className="fixed z-[60] pointer-events-none"
      style={{ left: 0, top: 0, width: '100%', height: '100%' }}
    >
      {/* Backdrop when expanded */}
      <AnimatePresence>
        {state === 'expanded' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-[2px] pointer-events-auto"
            onClick={handleClose}
          />
        )}
      </AnimatePresence>

      {/* Bubble + Panel container */}
      <div
        className="absolute pointer-events-auto"
        style={{
          left: position.x,
          top: position.y,
          transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Expanded Chat Panel */}
        <AnimatePresence>
          {state === 'expanded' && (
            <div
              className="absolute"
              style={{
                [isRightSide ? 'right' : 'left']: 0,
                [isBottomHalf ? 'bottom' : 'top']: 64,
              }}
            >
              <MiniChat
                onClose={handleClose}
                onVoiceMode={handleVoiceMode}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Floating Bubble */}
        <FloatingBubble
          hasNotification={false}
          isTyping={isTyping}
          onTap={handleBubbleTap}
          dragHandlers={handlers}
          hasMoved={hasMoved}
        />
      </div>
    </div>
  )
}
