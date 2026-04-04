'use client'

import { useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mic, MicOff, Hand } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VoiceVisualizer } from './VoiceVisualizer'
import { VoiceSelector } from './VoiceSelector'
import { useVoiceChat } from '@/hooks/useVoiceChat'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  sendMessage,
  selectCurrentConversationId,
  selectIsTyping,
  selectMessages,
  selectAssistantError,
} from '@/state/slices/assistantSlice'
import { cn } from '@/lib/utils'
import type { VoiceChatState } from '@/types/voice'

interface VoiceModeProps {
  onClose: () => void
  onAudioLevel?: (level: number) => void
}

const STATUS_TEXT: Record<VoiceChatState, string> = {
  idle: 'AWAITING INPUT',
  listening: 'RECEIVING...',
  processing: 'PROCESSING...',
  speaking: 'TRANSMITTING...',
}

export function VoiceMode({ onClose, onAudioLevel }: VoiceModeProps) {
  const dispatch = useAppDispatch()
  const conversationId = useAppSelector(selectCurrentConversationId)
  const isTyping = useAppSelector(selectIsTyping)
  const messages = useAppSelector(selectMessages)
  const reduxError = useAppSelector(selectAssistantError)
  const prevMessageCountRef = useRef(messages.length)

  const voiceChatRef = useRef<ReturnType<typeof useVoiceChat> | null>(null)

  const handleTranscript = useCallback(
    async (transcript: string) => {
      // Send to the existing Claude assistant API
      const result = await dispatch(
        sendMessage({ conversationId: conversationId ?? undefined, content: transcript })
      )

      // If sendMessage was rejected, reset voice state and show error
      if (sendMessage.rejected.match(result)) {
        voiceChatRef.current?.setVoiceState('idle')
      }
    },
    [dispatch, conversationId]
  )

  const voiceChat = useVoiceChat({ onTranscript: handleTranscript })
  voiceChatRef.current = voiceChat

  const {
    voiceState,
    transcript,
    interimTranscript,
    audioLevel,
    selectedVoice,
    error,
    isSupported,
    startListening,
    stopListening,
    speak,
    interrupt,
    setSelectedVoice,
    previewVoice,
    setVoiceState,
    clearError,
  } = voiceChat

  // Forward audio level to parent (for SeismicWave)
  useEffect(() => {
    onAudioLevel?.(audioLevel)
  }, [audioLevel, onAudioLevel])

  // When Claude responds (new assistant message added), speak it
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      // Check the last few messages for a new assistant message
      for (let i = messages.length - 1; i >= prevMessageCountRef.current; i--) {
        const msg = messages[i]
        if (msg?.role === 'assistant' && msg.content) {
          speak(msg.content)
          break
        }
      }
    }
    prevMessageCountRef.current = messages.length
  }, [messages, speak])

  // If Redux reports an error and we're stuck in processing, reset
  useEffect(() => {
    if (reduxError && voiceState === 'processing') {
      setVoiceState('idle')
    }
  }, [reduxError, voiceState, setVoiceState])

  const handleMicToggle = useCallback(() => {
    if (voiceState === 'listening') {
      stopListening()
    } else if (voiceState === 'speaking') {
      interrupt()
    } else {
      startListening()
    }
  }, [voiceState, startListening, stopListening, interrupt])

  const handleInterrupt = useCallback(() => {
    if (voiceState === 'speaking') {
      interrupt()
    }
  }, [voiceState, interrupt])

  // Auto-clear errors
  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, clearError])

  if (!isSupported) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      >
        <div className="bg-background rounded-2xl p-8 max-w-md text-center space-y-4">
          <MicOff className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="text-lg font-semibold">Voice Not Supported</h3>
          <p className="text-sm text-muted-foreground">
            Microphone access is not available in this environment. Please use a modern browser over
            HTTPS and allow microphone permissions.
          </p>
          <Button onClick={onClose}>Go Back</Button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-background via-background to-background/95"
    >
      {/* Background ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full"
          style={{
            background:
              voiceState === 'listening'
                ? 'radial-gradient(circle, rgba(255,90,31,0.12) 0%, transparent 70%)'
                : voiceState === 'speaking'
                  ? 'radial-gradient(circle, rgba(255,120,60,0.12) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(200,60,0,0.08) 0%, transparent 70%)',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: voiceState === 'idle' ? 0.3 : 0.6,
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4">
        <VoiceSelector
          selectedVoice={selectedVoice}
          onSelectVoice={setSelectedVoice}
          onPreviewVoice={previewVoice}
        />

        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-9 w-9 p-0 rounded-full hover:bg-muted/50"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Main content area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 gap-8">
        {/* Visualizer */}
        <VoiceVisualizer state={voiceState} audioLevel={audioLevel} />

        {/* Status text */}
        <AnimatePresence mode="wait">
          <motion.p
            key={voiceState}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={cn(
              'text-xs font-mono font-bold tracking-widest uppercase',
              voiceState === 'listening'
                ? 'text-primary'
                : voiceState === 'speaking'
                  ? 'text-violet-300'
                  : voiceState === 'processing'
                    ? 'text-violet-400 animate-tactical-blink'
                    : 'text-muted-foreground'
            )}
          >
            {STATUS_TEXT[voiceState]}
          </motion.p>
        </AnimatePresence>

        {/* Transcript display */}
        <div className="w-full max-w-lg min-h-[4rem] text-center">
          <AnimatePresence mode="wait">
            {(transcript || interimTranscript) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-1"
              >
                {transcript && (
                  <p className="text-base text-foreground">{transcript}</p>
                )}
                {interimTranscript && (
                  <p className="text-sm text-muted-foreground/60 italic">{interimTranscript}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Last assistant message (brief) */}
          <AnimatePresence>
            {voiceState === 'speaking' && messages.length > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-muted-foreground/50 mt-4 line-clamp-2 max-w-sm mx-auto"
              >
                {messages[messages.length - 1]?.content?.slice(0, 150)}
                {(messages[messages.length - 1]?.content?.length ?? 0) > 150 ? '...' : ''}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Error display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="px-4 py-2 rounded-lg bg-red-950/50 border border-red-800/50 text-red-300 text-xs max-w-sm text-center"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 flex items-center justify-center gap-6 px-6 pb-8 pt-4">
        {/* Interrupt button (when speaking) */}
        <AnimatePresence>
          {voiceState === 'speaking' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Button
                variant="outline"
                size="lg"
                onClick={handleInterrupt}
                className="h-14 w-14 rounded-full border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50"
              >
                <Hand className="h-5 w-5 text-red-400" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main mic button */}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            size="lg"
            onClick={handleMicToggle}
            disabled={voiceState === 'processing'}
            className={cn(
              'h-16 w-16 rounded-full shadow-lg transition-all duration-300',
              voiceState === 'listening'
                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
                : voiceState === 'speaking'
                  ? 'bg-violet-500 hover:bg-violet-600 shadow-violet-500/30'
                  : voiceState === 'processing'
                    ? 'bg-violet-900 opacity-50 cursor-not-allowed'
                    : 'bg-gradient-to-br from-violet-600 to-indigo-700 hover:from-violet-500 hover:to-indigo-600 shadow-violet-500/30'
            )}
          >
            {voiceState === 'listening' ? (
              <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                <MicOff className="h-6 w-6 text-white" />
              </motion.div>
            ) : (
              <Mic className="h-6 w-6 text-white" />
            )}
          </Button>
        </motion.div>

        {/* Spacer for layout balance */}
        <AnimatePresence>
          {voiceState === 'speaking' && <div className="w-14" />}
        </AnimatePresence>
      </div>

      {/* Status hints */}
      <AnimatePresence>
        {(voiceState === 'speaking' || voiceState === 'listening') && (
          <motion.p
            key={voiceState}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-muted-foreground/40"
          >
            {voiceState === 'listening'
              ? 'Tap the mic to stop · silence auto-stops'
              : 'Tap the stop button to interrupt'}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
