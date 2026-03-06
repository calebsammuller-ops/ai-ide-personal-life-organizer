'use client'

import { motion } from 'framer-motion'
import type { VoiceChatState } from '@/types/voice'
import { cn } from '@/lib/utils'

interface VoiceVisualizerProps {
  state: VoiceChatState
  audioLevel?: number  // 0-1, from MediaRecorder analyser
  className?: string
}

const BAR_OFFSETS = [0.6, 0.9, 1.0, 0.85, 0.65]

export function VoiceVisualizer({ state, audioLevel = 0, className }: VoiceVisualizerProps) {
  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      {/* Outer glow ring */}
      <motion.div
        className="absolute w-48 h-48 rounded-full"
        style={{
          background:
            state === 'listening'
              ? 'radial-gradient(circle, rgba(255,90,31,0.3) 0%, transparent 70%)'
              : state === 'speaking'
                ? 'radial-gradient(circle, rgba(255,120,60,0.3) 0%, transparent 70%)'
                : state === 'processing'
                  ? 'radial-gradient(circle, rgba(200,60,0,0.3) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(255,90,31,0.15) 0%, transparent 70%)',
        }}
        animate={{
          scale: state === 'idle' ? [1, 1.05, 1] : state === 'listening' ? [1, 1.2, 1] : [1, 1.1, 1],
          opacity: state === 'idle' ? [0.5, 0.7, 0.5] : 1,
        }}
        transition={{
          duration: state === 'listening' ? 1 : 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Ripple rings for listening state */}
      {state === 'listening' && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={`ripple-${i}`}
              className="absolute w-32 h-32 rounded-full border border-orange-500/30"
              initial={{ scale: 0.8, opacity: 0.6 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.6,
                ease: 'easeOut',
              }}
            />
          ))}
        </>
      )}

      {/* Speaking wave rings */}
      {state === 'speaking' && (
        <>
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={`wave-${i}`}
              className="absolute w-32 h-32 rounded-full border-2 border-orange-400/40"
              animate={{
                scale: [1, 1.4 + i * 0.15, 1],
                opacity: [0.4, 0, 0.4],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.3,
                ease: 'easeInOut',
              }}
            />
          ))}
        </>
      )}

      {/* Processing spinner */}
      {state === 'processing' && (
        <motion.div
          className="absolute w-36 h-36 rounded-full border-2 border-transparent"
          style={{
            borderTopColor: 'rgba(255,90,31,0.8)',
            borderRightColor: 'rgba(200,60,0,0.5)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Main orb */}
      <motion.div
        className={cn(
          'relative w-28 h-28 rounded-full flex items-center justify-center',
          'shadow-2xl',
        )}
        style={{
          background:
            state === 'listening'
              ? 'linear-gradient(135deg, #CC3F00, #FF5A1F, #CC3F00)'
              : state === 'speaking'
                ? 'linear-gradient(135deg, #FF7A3F, #FF9A60, #FF7A3F)'
                : state === 'processing'
                  ? 'linear-gradient(135deg, #8B2200, #CC3F00, #8B2200)'
                  : 'linear-gradient(135deg, #3D1200, #8B2200, #3D1200)',
          boxShadow:
            state === 'listening'
              ? '0 0 40px rgba(255,90,31,0.5), 0 0 80px rgba(255,90,31,0.2)'
              : state === 'speaking'
                ? '0 0 40px rgba(255,120,60,0.5), 0 0 80px rgba(255,120,60,0.2)'
                : state === 'processing'
                  ? '0 0 30px rgba(255,90,31,0.4)'
                  : '0 0 20px rgba(255,90,31,0.2)',
        }}
        animate={{
          scale:
            state === 'listening'
              ? [1, 1.08, 1, 1.04, 1]
              : state === 'speaking'
                ? [1, 1.06, 0.97, 1.03, 1]
                : state === 'processing'
                  ? [1, 1.02, 1]
                  : [1, 1.02, 1],
        }}
        transition={{
          duration: state === 'listening' ? 0.8 : state === 'speaking' ? 0.6 : 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Inner glow */}
        <motion.div
          className="absolute inset-2 rounded-full"
          style={{
            background:
              state === 'listening'
                ? 'radial-gradient(circle at 40% 40%, rgba(255,255,255,0.3), transparent 60%)'
                : state === 'speaking'
                  ? 'radial-gradient(circle at 40% 40%, rgba(255,255,255,0.25), transparent 60%)'
                  : 'radial-gradient(circle at 40% 40%, rgba(255,255,255,0.15), transparent 60%)',
          }}
        />

        {/* Audio bars for listening/speaking */}
        {(state === 'listening' || state === 'speaking') && (
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4].map((i) => {
              // Drive bar height from real mic level when available
              const isLiveAudio = state === 'listening' && audioLevel > 0.02
              return (
                <motion.div
                  key={`bar-${i}`}
                  className="w-1.5 rounded-full bg-white/80"
                  animate={{
                    height: isLiveAudio
                      ? Math.max(8, Math.min(40, audioLevel * 40 * BAR_OFFSETS[i]))
                      : state === 'listening'
                      ? [8, 24 + i * 4, 8]
                      : [8, 20 + i * 4, 12, 28, 8],
                  }}
                  transition={
                    isLiveAudio
                      ? { duration: 0.12, ease: 'easeOut' }
                      : {
                          duration: state === 'listening' ? 0.5 + i * 0.1 : 0.4 + i * 0.08,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          delay: i * 0.08,
                        }
                  }
                />
              )
            })}
          </div>
        )}

        {/* Processing dots */}
        {state === 'processing' && (
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={`dot-${i}`}
                className="w-2.5 h-2.5 bg-orange-300 rounded-sm"
                animate={{
                  y: [0, -8, 0],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.15,
                }}
              />
            ))}
          </div>
        )}

        {/* Idle mic icon (using div shapes) */}
        {state === 'idle' && (
          <div className="flex flex-col items-center">
            <motion.div
              className="w-6 h-8 rounded-full border-2 border-white/60"
              animate={{ opacity: [0.6, 0.9, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <div className="w-8 h-1 mt-1 border-b-2 border-white/40 rounded" />
          </div>
        )}
      </motion.div>
    </div>
  )
}
