'use client'

import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import { useState, useEffect, useCallback, useId } from 'react'

export type MascotMood = 'idle' | 'greeting' | 'thinking' | 'celebrating' | 'encouraging' | 'sleeping' | 'listening' | 'speaking' | 'concerned' | 'error'

interface MascotProps {
  mood?: MascotMood
  size?: 'sm' | 'md' | 'lg' | 'xl'
  message?: string
  showMessage?: boolean
  className?: string
  onClick?: () => void
  disableIdleAnimations?: boolean
}

const sizeMap = {
  sm: 48,
  md: 80,
  lg: 120,
  xl: 200,
}

type IdleAnimationType = 'blink' | 'headTilt' | 'breathe' | 'lookAround' | 'wiggle' | 'nod'

interface IdleAnimation {
  type: IdleAnimationType
  animation: object
  duration: number
}

const idleAnimations: IdleAnimation[] = [
  { type: 'blink', animation: { scaleY: [1, 0.1, 1] }, duration: 150 },
  { type: 'headTilt', animation: { rotate: [0, -5, 0] }, duration: 800 },
  { type: 'breathe', animation: { scale: [1, 1.03, 1] }, duration: 2000 },
  { type: 'lookAround', animation: { x: [0, 3, -3, 0] }, duration: 1200 },
  { type: 'wiggle', animation: { rotate: [0, 2, -2, 1, -1, 0] }, duration: 600 },
  { type: 'nod', animation: { y: [0, 3, 0] }, duration: 400 },
]

const moodAnimations: Record<MascotMood, object> = {
  idle: { y: [0, -5, 0], transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } },
  greeting: { rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1], transition: { duration: 0.8 } },
  thinking: { rotate: [0, 5, 0, -5, 0], transition: { duration: 2, repeat: Infinity } },
  celebrating: { y: [0, -20, 0], scale: [1, 1.2, 1], rotate: [0, 10, -10, 0], transition: { duration: 0.5, repeat: 3 } },
  encouraging: { scale: [1, 1.05, 1], transition: { duration: 1.5, repeat: Infinity } },
  sleeping: { rotate: [0, 2, 0, -2, 0], transition: { duration: 4, repeat: Infinity } },
  listening: { scale: [1, 1.02, 1], transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } },
  speaking: { y: [0, -3, 0], scale: [1, 1.04, 1], transition: { duration: 0.6, repeat: Infinity } },
  concerned: { rotate: [0, -3, 0], y: [0, 2, 0], transition: { duration: 2, repeat: Infinity } },
  error: { x: [-3, 3, -3, 3, 0], transition: { duration: 0.4 } },
}

const moodMessages: Record<MascotMood, string[]> = {
  idle: ['Ready to help!', 'What shall we do today?', "I'm here for you!"],
  greeting: ['Hey there!', 'Welcome back!', 'Great to see you!'],
  thinking: ['Hmm, let me think...', 'Processing...', 'Working on it...'],
  celebrating: ['Amazing job!', 'You did it!', 'Keep crushing it!'],
  encouraging: ['You got this!', 'Keep going!', 'Almost there!'],
  sleeping: ['Zzz...', 'Taking a rest...', 'Recharging...'],
  listening: ["I'm listening...", 'Go ahead...', 'Tell me more...'],
  speaking: ["Here's what I found...", 'Let me explain...', "So here's the thing..."],
  concerned: ["Hmm, that's tricky...", 'Let me help with that...', 'I see the issue...'],
  error: ['Something went wrong...', 'Let me try again...', 'Oops, hold on...'],
}

type VisorExpr = 'normal' | 'happy' | 'curious' | 'wide' | 'stars' | 'worried' | 'off'

function getVisorExpr(mood: MascotMood, isBlinking: boolean): VisorExpr {
  if (isBlinking) return 'off'
  switch (mood) {
    case 'sleeping': return 'off'
    case 'celebrating': return 'stars'
    case 'greeting': case 'encouraging': return 'happy'
    case 'thinking': return 'curious'
    case 'listening': return 'wide'
    case 'concerned': case 'error': return 'worried'
    default: return 'normal'
  }
}

type MouthVariant = 'smile' | 'big_smile' | 'open' | 'flat' | 'sad'

function getMouthVariant(mood: MascotMood): MouthVariant {
  switch (mood) {
    case 'celebrating': case 'greeting': return 'big_smile'
    case 'idle': case 'encouraging': return 'smile'
    case 'sleeping': return 'flat'
    case 'concerned': case 'error': return 'sad'
    case 'speaking': case 'listening': return 'open'
    default: return 'smile'
  }
}

// Cyberpunk hunter character — dark visor, red halo, cyan neon armor
export function MascotSVG({ mood, isBlinking, size }: { mood: MascotMood; isBlinking: boolean; size: number }) {
  const uid = useId().replace(/:/g, '')
  const visorExpr = getVisorExpr(mood, isBlinking)
  const mouthVariant = getMouthVariant(mood)

  const isError = mood === 'error'

  return (
    <svg
      viewBox="0 0 200 220"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        {/* Helmet metallic gradient */}
        <radialGradient id={`hg-${uid}`} cx="36%" cy="26%" r="74%">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="45%" stopColor="#0d1f3c" />
          <stop offset="100%" stopColor="#06101e" />
        </radialGradient>

        {/* Visor deep black */}
        <radialGradient id={`vg-${uid}`} cx="42%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#080d18" />
          <stop offset="100%" stopColor="#020406" />
        </radialGradient>

        {/* Body armor gradient */}
        <radialGradient id={`bg-${uid}`} cx="38%" cy="26%" r="76%">
          <stop offset="0%" stopColor="#18304e" />
          <stop offset="55%" stopColor="#0c1a30" />
          <stop offset="100%" stopColor="#050d1c" />
        </radialGradient>

        {/* Halo red-orange gradient */}
        <linearGradient id={`hal-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff5050" />
          <stop offset="40%" stopColor="#ff1a1a" />
          <stop offset="100%" stopColor="#ff8000" />
        </linearGradient>

        {/* Chest emblem blue */}
        <radialGradient id={`eg-${uid}`} cx="38%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </radialGradient>

        {/* Shoulder gradient */}
        <radialGradient id={`sg-${uid}`} cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#162a48" />
          <stop offset="100%" stopColor="#070f1e" />
        </radialGradient>

        {/* Visor highlight */}
        <radialGradient id={`vs-${uid}`} cx="60%" cy="22%" r="55%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>

        {/* Helmet highlight */}
        <radialGradient id={`hs-${uid}`} cx="65%" cy="18%" r="52%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>

        {/* Halo glow filter */}
        <filter id={`hf-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor={isError ? '#ff2020' : '#ff2020'} floodOpacity="0.75" />
        </filter>

        {/* Head blue glow */}
        <filter id={`hef-${uid}`} x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="5" stdDeviation="10" floodColor="#0055aa" floodOpacity="0.5" />
        </filter>

        {/* Cyan glow */}
        <filter id={`cf-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#00d4ff" floodOpacity="1" />
        </filter>

        {/* Error red glow */}
        <filter id={`ef-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ff4040" floodOpacity="1" />
        </filter>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="100" cy="214" rx="54" ry="8" fill="rgba(0,0,0,0.22)" />

      {/* ── HALO RING (rendered behind everything) ── */}
      <circle
        cx="100" cy="78"
        r="70"
        fill="none"
        stroke={`url(#hal-${uid})`}
        strokeWidth="9"
        filter={`url(#hf-${uid})`}
        opacity={isError ? '0.5' : '0.92'}
      />

      {/* ── BODY ── */}
      {/* Main torso */}
      <rect x="38" y="150" width="124" height="58" rx="24"
        fill={`url(#bg-${uid})`}
      />
      {/* Body neon border */}
      <rect x="38" y="150" width="124" height="58" rx="24"
        fill="none"
        stroke="#0066aa"
        strokeWidth="1.5"
        opacity="0.55"
      />

      {/* Armor grid lines */}
      <line x1="56" y1="163" x2="144" y2="163" stroke="#004488" strokeWidth="0.9" opacity="0.45" />
      <line x1="56" y1="174" x2="144" y2="174" stroke="#004488" strokeWidth="0.9" opacity="0.35" />
      <line x1="78" y1="152" x2="78" y2="206" stroke="#004488" strokeWidth="0.9" opacity="0.3" />
      <line x1="100" y1="152" x2="100" y2="206" stroke="#004488" strokeWidth="0.9" opacity="0.3" />
      <line x1="122" y1="152" x2="122" y2="206" stroke="#004488" strokeWidth="0.9" opacity="0.3" />

      {/* Shoulder pauldrons */}
      <rect x="12" y="153" width="36" height="48" rx="14"
        fill={`url(#sg-${uid})`}
        stroke="#005599"
        strokeWidth="1.2"
        strokeOpacity="0.5"
      />
      <rect x="152" y="153" width="36" height="48" rx="14"
        fill={`url(#sg-${uid})`}
        stroke="#005599"
        strokeWidth="1.2"
        strokeOpacity="0.5"
      />
      {/* Shoulder neon accents */}
      <line x1="18" y1="166" x2="42" y2="166" stroke="#00aaff" strokeWidth="1" opacity="0.4" />
      <line x1="158" y1="166" x2="182" y2="166" stroke="#00aaff" strokeWidth="1" opacity="0.4" />
      <line x1="18" y1="178" x2="42" y2="178" stroke="#00aaff" strokeWidth="0.7" opacity="0.25" />
      <line x1="158" y1="178" x2="182" y2="178" stroke="#00aaff" strokeWidth="0.7" opacity="0.25" />

      {/* Chest shield emblem */}
      <path d="M100 160 L115 167 L115 180 Q115 189 100 194 Q85 189 85 180 L85 167 Z"
        fill={`url(#eg-${uid})`}
        stroke="#93c5fd"
        strokeWidth="0.8"
        opacity="0.9"
      />
      {/* Lock icon in emblem */}
      <rect x="94" y="174" width="12" height="9" rx="2" fill="rgba(255,255,255,0.35)" />
      <path d="M96 174 Q96 169 100 169 Q104 169 104 174" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />

      {/* Belt */}
      <rect x="50" y="200" width="100" height="11" rx="5.5"
        fill="#08121f"
        stroke="#004f99"
        strokeWidth="1"
        strokeOpacity="0.6"
      />
      {/* Belt buckle */}
      <rect x="88" y="202" width="24" height="7" rx="3"
        fill="#0d2a60"
        stroke="#60a5fa"
        strokeWidth="0.8"
        opacity="0.9"
      />
      {/* Belt detail studs */}
      {[60, 72, 128, 140].map((x) => (
        <rect key={x} x={x} y="203" width="5" height="5" rx="1.5"
          fill="#0d2a60"
          stroke="#0077cc"
          strokeWidth="0.6"
          opacity="0.7"
        />
      ))}

      {/* ── NECK ── */}
      <rect x="82" y="132" width="36" height="24" rx="10"
        fill="#0d1f3c"
        stroke="#003a6e"
        strokeWidth="1"
      />
      {/* Neck detail lines */}
      <line x1="85" y1="140" x2="115" y2="140" stroke="#0055aa" strokeWidth="0.8" opacity="0.4" />
      <line x1="85" y1="147" x2="115" y2="147" stroke="#0055aa" strokeWidth="0.8" opacity="0.3" />

      {/* ── HEAD / HELMET ── */}
      <ellipse cx="100" cy="78" rx="58" ry="62"
        fill={`url(#hg-${uid})`}
        filter={`url(#hef-${uid})`}
      />
      {/* Helmet outer rim */}
      <ellipse cx="100" cy="78" rx="58" ry="62"
        fill="none"
        stroke="#0077bb"
        strokeWidth="1.5"
        opacity="0.5"
      />
      {/* Helmet 3D highlight */}
      <ellipse cx="100" cy="78" rx="58" ry="62"
        fill={`url(#hs-${uid})`}
      />

      {/* Helmet top panel ridge */}
      <path d="M70 22 Q100 12 130 22 Q120 30 100 32 Q80 30 70 22"
        fill="#0d2040"
        stroke="#1a4080"
        strokeWidth="0.8"
        opacity="0.75"
      />

      {/* ── VISOR (face plate) ── */}
      <ellipse cx="100" cy="80" rx="46" ry="52"
        fill={`url(#vg-${uid})`}
        stroke={isError ? '#ff4040' : '#00aadd'}
        strokeWidth="1.8"
        opacity="0.96"
      />
      {/* Visor inner glow rim */}
      <ellipse cx="100" cy="80" rx="46" ry="52"
        fill="none"
        stroke={isError ? '#ff2020' : '#00d4ff'}
        strokeWidth="0.8"
        opacity="0.4"
        filter={isError ? `url(#ef-${uid})` : `url(#cf-${uid})`}
      />
      {/* Visor 3D highlight */}
      <ellipse cx="100" cy="80" rx="46" ry="52"
        fill={`url(#vs-${uid})`}
      />

      {/* ── VISOR EXPRESSIONS (holographic projection) ── */}
      {visorExpr === 'normal' && (
        <>
          <circle cx="76" cy="74" r="9.5" fill="#00aadd" opacity="0.12" />
          <circle cx="76" cy="74" r="7.5" fill="#00d4ff" filter={`url(#cf-${uid})`} opacity="0.88" />
          <circle cx="76" cy="74" r="4.5" fill="#002a44" />
          <circle cx="78.5" cy="71.5" r="2" fill="rgba(180,240,255,0.75)" />

          <circle cx="124" cy="74" r="9.5" fill="#00aadd" opacity="0.12" />
          <circle cx="124" cy="74" r="7.5" fill="#00d4ff" filter={`url(#cf-${uid})`} opacity="0.88" />
          <circle cx="124" cy="74" r="4.5" fill="#002a44" />
          <circle cx="126.5" cy="71.5" r="2" fill="rgba(180,240,255,0.75)" />
        </>
      )}

      {visorExpr === 'happy' && (
        <>
          {/* Upward curved crescent eyes */}
          <path d="M64 78 Q76 63 88 78" fill="none" stroke="#00d4ff" strokeWidth="5" strokeLinecap="round" filter={`url(#cf-${uid})`} />
          <path d="M112 78 Q124 63 136 78" fill="none" stroke="#00d4ff" strokeWidth="5" strokeLinecap="round" filter={`url(#cf-${uid})`} />
          {/* Smile arc */}
          <path d="M82 100 Q100 114 118 100" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        </>
      )}

      {visorExpr === 'curious' && (
        <>
          {/* Left: normal */}
          <circle cx="76" cy="76" r="8" fill="#00d4ff" filter={`url(#cf-${uid})`} opacity="0.85" />
          <circle cx="76" cy="76" r="5" fill="#002a44" />
          <circle cx="78" cy="74" r="2" fill="rgba(180,240,255,0.65)" />
          {/* Right: shifted up, slightly bigger (curious tilt) */}
          <circle cx="126" cy="70" r="9.5" fill="#00d4ff" filter={`url(#cf-${uid})`} opacity="0.85" />
          <circle cx="126" cy="70" r="5.5" fill="#002a44" />
          <circle cx="128.5" cy="67.5" r="2.5" fill="rgba(180,240,255,0.65)" />
          {/* Raised eyebrow right */}
          <path d="M114 59 Q126 53 138 58" fill="none" stroke="#0099dd" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
        </>
      )}

      {visorExpr === 'wide' && (
        <>
          {/* Large wide-open alert eyes */}
          <circle cx="76" cy="74" r="12" fill="#00aadd" opacity="0.14" />
          <circle cx="76" cy="74" r="9.5" fill="#00d4ff" filter={`url(#cf-${uid})`} opacity="0.9" />
          <circle cx="76" cy="74" r="6" fill="#001e38" />
          <circle cx="79" cy="71" r="2.5" fill="rgba(180,240,255,0.75)" />

          <circle cx="124" cy="74" r="12" fill="#00aadd" opacity="0.14" />
          <circle cx="124" cy="74" r="9.5" fill="#00d4ff" filter={`url(#cf-${uid})`} opacity="0.9" />
          <circle cx="124" cy="74" r="6" fill="#001e38" />
          <circle cx="127" cy="71" r="2.5" fill="rgba(180,240,255,0.75)" />
        </>
      )}

      {visorExpr === 'stars' && (
        <>
          <circle cx="76" cy="74" r="12" fill="#FFD700" opacity="0.18" />
          <text x="65" y="81" fontSize="18" fill="#FFD700" fontWeight="bold"
            style={{ filter: 'drop-shadow(0 0 5px #FFD700)' }}>★</text>
          <circle cx="124" cy="74" r="12" fill="#FFD700" opacity="0.18" />
          <text x="113" y="81" fontSize="18" fill="#FFD700" fontWeight="bold"
            style={{ filter: 'drop-shadow(0 0 5px #FFD700)' }}>★</text>
        </>
      )}

      {visorExpr === 'worried' && (
        <>
          {/* Eyes shifted down, dimmer */}
          <circle cx="76" cy="79" r="8" fill="#0099cc" filter={`url(#cf-${uid})`} opacity="0.7" />
          <circle cx="76" cy="79" r="5" fill="#002a44" />
          <circle cx="124" cy="79" r="8" fill="#0099cc" filter={`url(#cf-${uid})`} opacity="0.7" />
          <circle cx="124" cy="79" r="5" fill="#002a44" />
          {/* Worried brows angled inward */}
          <path d="M62 64 Q74 70 83 65" fill="none" stroke="#00aaff" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
          <path d="M117 65 Q126 70 138 64" fill="none" stroke="#00aaff" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
          {/* Frown */}
          <path d="M83 103 Q100 96 117 103" fill="none" stroke="#0088cc" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
        </>
      )}

      {visorExpr === 'off' && (
        <>
          {/* Powered down — dim horizontal bars */}
          <line x1="62" y1="74" x2="90" y2="74" stroke="#003a6e" strokeWidth="3.5" strokeLinecap="round" opacity="0.55" />
          <line x1="110" y1="74" x2="138" y2="74" stroke="#003a6e" strokeWidth="3.5" strokeLinecap="round" opacity="0.55" />
        </>
      )}

      {/* ── SPEAKER GRILLE / MOUTH ── */}
      {mouthVariant === 'flat' && (
        <line x1="84" y1="107" x2="116" y2="107" stroke="#003a6e" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      )}
      {mouthVariant === 'big_smile' && (
        <>
          <path d="M78 104 Q100 120 122 104" fill="#001525" stroke="#00aaff" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
          <path d="M78 104 Q100 111 122 104" fill="rgba(0,170,255,0.1)" />
          {[84, 92, 100, 108, 116].map((x, i) => (
            <circle key={i} cx={x} cy="106" r="1.8" fill="#00ccff" opacity="0.5" />
          ))}
        </>
      )}
      {mouthVariant === 'smile' && (
        <path d="M83 104 Q100 116 117 104" fill="none" stroke="#0088cc" strokeWidth="2" strokeLinecap="round" opacity="0.65" />
      )}
      {mouthVariant === 'open' && (
        <ellipse cx="100" cy="107" rx="13" ry="8"
          fill="#001020"
          stroke="#00aaff"
          strokeWidth="1.5"
          opacity="0.82"
        />
      )}
      {mouthVariant === 'sad' && (
        <path d="M83 110 Q100 101 117 110" fill="none" stroke="#0077aa" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      )}

      {/* Collar / neck ring */}
      <ellipse cx="100" cy="136" rx="40" ry="9"
        fill="#0a1830"
        stroke="#1a4070"
        strokeWidth="1.5"
        opacity="0.9"
      />
      <ellipse cx="100" cy="134" rx="36" ry="7"
        fill="none"
        stroke="#0066aa"
        strokeWidth="1"
        opacity="0.45"
      />
    </svg>
  )
}

export function Mascot({
  mood = 'idle',
  size = 'md',
  message,
  showMessage = false,
  className = '',
  onClick,
  disableIdleAnimations = false,
}: MascotProps) {
  const [displayMessage, setDisplayMessage] = useState('')
  const [isBlinking, setIsBlinking] = useState(false)
  const [currentIdleAnim, setCurrentIdleAnim] = useState<IdleAnimation | null>(null)
  const controls = useAnimation()
  const pixelSize = sizeMap[size]

  useEffect(() => {
    if (showMessage) {
      const messages = moodMessages[mood]
      setDisplayMessage(message || messages[Math.floor(Math.random() * messages.length)])
    }
  }, [mood, message, showMessage])

  const triggerRandomIdleAnimation = useCallback(async () => {
    if (disableIdleAnimations || mood !== 'idle') return
    const randomAnim = idleAnimations[Math.floor(Math.random() * idleAnimations.length)]
    setCurrentIdleAnim(randomAnim)
    if (randomAnim.type === 'blink') {
      setIsBlinking(true)
      setTimeout(() => setIsBlinking(false), randomAnim.duration)
    }
    await controls.start({
      ...randomAnim.animation,
      transition: { duration: randomAnim.duration / 1000, ease: 'easeInOut' },
    })
    setCurrentIdleAnim(null)
  }, [controls, disableIdleAnimations, mood])

  useEffect(() => {
    if (disableIdleAnimations || mood !== 'idle') return
    const scheduleNext = () => {
      const delay = 2000 + Math.random() * 4000
      return setTimeout(() => {
        triggerRandomIdleAnimation()
        scheduleNext()
      }, delay)
    }
    const initialTimeout = setTimeout(() => {
      setIsBlinking(true)
      setTimeout(() => setIsBlinking(false), 150)
    }, 1000)
    const intervalId = scheduleNext()
    return () => {
      clearTimeout(initialTimeout)
      clearTimeout(intervalId)
    }
  }, [mood, disableIdleAnimations, triggerRandomIdleAnimation])

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      {/* Speech Bubble — above the character, arrow pointing down */}
      <AnimatePresence>
        {showMessage && displayMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.8 }}
            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap z-20"
            style={{ bottom: `${pixelSize + 10}px` }}
          >
            <div className="bg-white dark:bg-zinc-800 text-foreground px-3 py-2 rounded-2xl text-sm font-medium shadow-lg border border-border/50 relative">
              {displayMessage}
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-[7px] w-0 h-0 border-l-[7px] border-r-[7px] border-t-[7px] border-l-transparent border-r-transparent border-t-white dark:border-t-zinc-800" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mascot Container */}
      <motion.div
        animate={currentIdleAnim ? {} : moodAnimations[mood]}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={onClick ? 'cursor-pointer' : ''}
      >
        <motion.div
          animate={controls}
          className="relative"
          style={{ width: pixelSize, height: pixelSize }}
        >
          {/* Glow — matches the cyberpunk aesthetic */}
          <motion.div
            className="absolute inset-0 rounded-full blur-xl pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, rgba(0,100,220,0.2) 60%, transparent 100%)',
            }}
            animate={{ opacity: [0.4, 0.65, 0.4], scale: [1, 1.12, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />

          <MascotSVG mood={mood} isBlinking={isBlinking} size={pixelSize} />
        </motion.div>
      </motion.div>

      {/* Celebrating confetti */}
      {mood === 'celebrating' && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-sm"
              style={{
                background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#00D4FF', '#60A5FA', '#FFEAA7', '#DDA0DD', '#7C3AED'][i],
              }}
              initial={{ x: pixelSize / 2, y: pixelSize / 2, opacity: 1 }}
              animate={{
                x: pixelSize / 2 + Math.cos((i * 45 * Math.PI) / 180) * 70,
                y: pixelSize / 2 + Math.sin((i * 45 * Math.PI) / 180) * 70,
                opacity: 0,
                scale: [1, 1.5, 0],
                rotate: [0, 180],
              }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.1 }}
            />
          ))}
        </div>
      )}

      {/* Sleeping Zzz */}
      {mood === 'sleeping' && (
        <div className="absolute -right-2 -top-2 pointer-events-none">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute text-blue-400 font-bold"
              style={{ fontSize: 13 - i * 2 }}
              initial={{ opacity: 0, x: 0, y: 0 }}
              animate={{ opacity: [0, 1, 1, 0], x: [0, 10 + i * 5], y: [0, -15 - i * 10] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
            >
              Z
            </motion.span>
          ))}
        </div>
      )}

      {/* Thinking Sparkles */}
      {mood === 'thinking' && (
        <div className="absolute -right-1 -top-1 pointer-events-none">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute text-purple-400"
              style={{ fontSize: 10 - i * 2 }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5], y: [-5 - i * 8, -18 - i * 10] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
            >
              ✨
            </motion.div>
          ))}
        </div>
      )}

      {/* Encouraging Hearts */}
      {mood === 'encouraging' && (
        <motion.div
          className="absolute -right-1 top-0 pointer-events-none"
          animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          ❤️
        </motion.div>
      )}

      {/* Listening — pulsing ring */}
      {mood === 'listening' && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-cyan-400/60 pointer-events-none"
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
          style={{ width: pixelSize, height: pixelSize }}
        />
      )}

      {/* Speaking — audio waves */}
      {mood === 'speaking' && (
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 pointer-events-none flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1 bg-cyan-400 rounded-full"
              animate={{ height: [4, 14, 4] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      )}

      {/* Concerned — warning */}
      {mood === 'concerned' && (
        <motion.div
          className="absolute -right-1 -top-1 pointer-events-none"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ fontSize: pixelSize * 0.2 }}
        >
          ⚠️
        </motion.div>
      )}

      {/* Error — red flash */}
      {mood === 'error' && (
        <motion.div
          className="absolute inset-0 rounded-full bg-red-500/20 pointer-events-none"
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{ duration: 0.8, repeat: 2 }}
          style={{ width: pixelSize, height: pixelSize }}
        />
      )}
    </div>
  )
}

// Compact mascot for headers/nav
export function MascotMini({ className = '' }: { className?: string }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      whileHover={{ scale: 1.1, rotate: 5 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`relative w-8 h-8 ${className}`}
    >
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1.2 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 rounded-full blur-md"
            style={{
              background: 'radial-gradient(circle, rgba(124,58,237,0.5) 0%, rgba(0,100,220,0.3) 70%, transparent 100%)',
            }}
          />
        )}
      </AnimatePresence>
      <motion.div
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <MascotSVG mood="idle" isBlinking={false} size={32} />
      </motion.div>
    </motion.div>
  )
}
