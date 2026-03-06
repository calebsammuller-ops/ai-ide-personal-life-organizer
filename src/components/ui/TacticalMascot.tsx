'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export type MascotMood = 'idle' | 'thinking' | 'speaking' | 'success' | 'warning' | 'greeting' | 'celebrating' | 'sleeping' | 'encouraging' | 'listening' | 'error'
type MascotSize = 'sm' | 'md' | 'lg'

interface TacticalMascotProps {
  mood?: MascotMood
  size?: MascotSize
  className?: string
}

const sizeMap: Record<MascotSize, number> = { sm: 32, md: 48, lg: 64 }

const moodColor: Record<MascotMood, string> = {
  idle:        'rgba(255,90,31,0.35)',
  thinking:    'rgba(255,90,31,0.7)',
  speaking:    'rgba(255,90,31,1)',
  success:     'rgba(74,222,128,0.9)',
  warning:     'rgba(251,191,36,0.9)',
  greeting:    'rgba(255,90,31,0.9)',
  celebrating: 'rgba(74,222,128,1)',
  sleeping:    'rgba(255,90,31,0.2)',
  encouraging: 'rgba(255,140,50,0.85)',
  listening:   'rgba(255,90,31,0.8)',
  error:       'rgba(239,68,68,0.9)',
}

const moodGlow: Record<MascotMood, string> = {
  idle:        'none',
  thinking:    '0 0 8px rgba(255,90,31,0.4)',
  speaking:    '0 0 14px rgba(255,90,31,0.6)',
  success:     '0 0 12px rgba(74,222,128,0.5)',
  warning:     '0 0 12px rgba(251,191,36,0.5)',
  greeting:    '0 0 14px rgba(255,90,31,0.5)',
  celebrating: '0 0 16px rgba(74,222,128,0.6)',
  sleeping:    'none',
  encouraging: '0 0 10px rgba(255,140,50,0.4)',
  listening:   '0 0 12px rgba(255,90,31,0.5)',
  error:       '0 0 12px rgba(239,68,68,0.5)',
}

export function TacticalMascot({ mood = 'idle', size = 'md', className }: TacticalMascotProps) {
  const px = sizeMap[size]
  const stroke = moodColor[mood]
  const isThinking = mood === 'thinking'
  const isSpeaking = mood === 'speaking' || mood === 'listening'
  const isActive = mood === 'greeting' || mood === 'celebrating' || mood === 'encouraging'
  const isSleeping = mood === 'sleeping'

  const innerR = px * 0.22
  const outerR = px * 0.38
  const bracketSize = px * 0.16
  const center = px / 2

  return (
    <div
      className={cn('relative inline-flex items-center justify-center flex-shrink-0', className)}
      style={{ width: px, height: px }}
    >
      <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} style={{ filter: `drop-shadow(${moodGlow[mood]})` }}>
        {/* Outer hexagon — rotates when thinking/greeting */}
        <motion.polygon
          points={Array.from({ length: 6 }, (_, i) => {
            const angle = (Math.PI / 3) * i - Math.PI / 6
            return `${center + outerR * Math.cos(angle)},${center + outerR * Math.sin(angle)}`
          }).join(' ')}
          fill="none"
          stroke={stroke}
          strokeWidth={size === 'sm' ? 1 : 1.5}
          animate={isThinking || isActive ? { rotate: 360 } : { rotate: 0 }}
          transition={isThinking || isActive ? { duration: isThinking ? 3 : 8, repeat: Infinity, ease: 'linear' } : {}}
          style={{ transformOrigin: `${center}px ${center}px` }}
        />

        {/* Corner brackets */}
        {[
          { x: center - outerR * 0.6, y: center - outerR * 0.6, rx: 1, ry: 0, lx: 0, ly: 1 },
          { x: center + outerR * 0.6, y: center - outerR * 0.6, rx: -1, ry: 0, lx: 0, ly: 1 },
          { x: center - outerR * 0.6, y: center + outerR * 0.6, rx: 1, ry: 0, lx: 0, ly: -1 },
          { x: center + outerR * 0.6, y: center + outerR * 0.6, rx: -1, ry: 0, lx: 0, ly: -1 },
        ].map((b, i) => (
          <g key={i}>
            <line
              x1={b.x} y1={b.y}
              x2={b.x + b.rx * bracketSize} y2={b.y}
              stroke={stroke} strokeWidth={size === 'sm' ? 1 : 1.5} strokeLinecap="square"
            />
            <line
              x1={b.x} y1={b.y}
              x2={b.x} y2={b.y + b.ly * bracketSize}
              stroke={stroke} strokeWidth={size === 'sm' ? 1 : 1.5} strokeLinecap="square"
            />
          </g>
        ))}

        {/* Inner circle — pulses when speaking/greeting */}
        <motion.circle
          cx={center} cy={center} r={innerR}
          fill="none"
          stroke={stroke}
          strokeWidth={size === 'sm' ? 1 : 1.5}
          animate={isSpeaking || isActive ? { scale: [1, 1.15, 1] } : { scale: 1 }}
          transition={isSpeaking || isActive ? { duration: 0.8, repeat: Infinity, ease: 'easeInOut' } : {}}
          style={{ transformOrigin: `${center}px ${center}px` }}
        />

        {/* Center dot — blinks when thinking, slow pulse otherwise */}
        <motion.circle
          cx={center} cy={center} r={px * 0.05}
          fill={stroke}
          animate={
            isThinking
              ? { opacity: [1, 0.1, 1] }
              : isSleeping
              ? { opacity: [0.2, 0.1, 0.2] }
              : { opacity: [0.8, 0.5, 0.8] }
          }
          transition={{
            duration: isThinking ? 0.6 : isSleeping ? 2.5 : 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Status dot bottom-right */}
        <circle
          cx={center + outerR * 0.7}
          cy={center + outerR * 0.7}
          r={px * 0.045}
          fill={stroke}
        />
      </svg>
    </div>
  )
}
