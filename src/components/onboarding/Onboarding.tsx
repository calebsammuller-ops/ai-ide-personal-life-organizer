'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, Sparkles, Network, Zap, Lock, ChevronLeft } from 'lucide-react'
import { useAppDispatch } from '@/state/hooks'
import { createNote } from '@/state/slices/knowledgeSlice'

interface OnboardingProps {
  onComplete: () => void
  userName?: string
}

const TOTAL_STEPS = 7

const variants = {
  enter: (dir: number) => ({ x: dir * 60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -60, opacity: 0 }),
}

function GlowIcon({ icon: Icon, className = '' }: { icon: React.ElementType; className?: string }) {
  return (
    <motion.div
      className={`relative w-20 h-20 mx-auto mb-6 flex items-center justify-center ${className}`}
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl" />
      <div className="relative w-16 h-16 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center">
        <Icon className="w-8 h-8 text-primary" />
      </div>
    </motion.div>
  )
}

export function Onboarding({ onComplete, userName }: OnboardingProps) {
  const dispatch = useAppDispatch()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [captured, setCaptured] = useState<string | null>(null)
  const [inputVal, setInputVal] = useState('')
  const [confettiDone, setConfettiDone] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const goNext = () => {
    setDir(1)
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))
  }
  const goPrev = () => {
    setDir(-1)
    setStep((s) => Math.max(s - 1, 0))
  }

  const handleCapture = () => {
    if (!inputVal.trim()) return
    setCaptured(inputVal.trim())
    dispatch(createNote({ title: inputVal.trim(), content: '', type: 'fleeting', tags: ['onboarding'] }))
    setTimeout(() => goNext(), 800)
  }

  // Fire confetti on step 6 (index 6 = "Ready")
  useEffect(() => {
    if (step === 6 && !confettiDone) {
      setConfettiDone(true)
      import('canvas-confetti').then((m) => {
        const confetti = m.default
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 }, colors: ['#ff6400', '#ffaa00', '#fff'] })
      }).catch(() => {})
    }
  }, [step, confettiDone])

  const stepContent = [
    // Step 0 — FEEL IT
    <motion.div key="feel" custom={dir} variants={variants} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.3, ease: 'easeInOut' }} className="w-full max-w-md mx-auto text-center">
      <motion.p className="text-[9px] font-mono uppercase tracking-widest text-primary/50 mb-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        STEP 1 OF 7
      </motion.p>
      <motion.h2 className="text-2xl font-mono font-bold mb-2"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        Drop a thought. Right now.
      </motion.h2>
      <motion.div className="mt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
        <AnimatePresence mode="wait">
          {!captured ? (
            <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <textarea
                ref={inputRef}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCapture() } }}
                placeholder="Something you're thinking about..."
                autoFocus
                className="w-full h-24 bg-card/50 border border-border/30 rounded-sm px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/30 resize-none focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
              />
              <button onClick={handleCapture} disabled={!inputVal.trim()}
                className="mt-3 px-6 py-2 text-[10px] font-mono uppercase tracking-widest border border-primary/30 text-primary/70 rounded-sm hover:bg-primary/10 disabled:opacity-30 transition-colors">
                CAPTURE →
              </button>
            </motion.div>
          ) : (
            <motion.div key="captured" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="border border-primary/20 bg-primary/5 rounded-sm p-4 text-left">
              <p className="text-[9px] font-mono text-primary/50 uppercase tracking-widest mb-1">CAPTURED</p>
              <p className="font-mono text-sm text-foreground">{captured}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>,

    // Step 1 — CAPTURE
    <motion.div key="capture" custom={dir} variants={variants} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.3, ease: 'easeInOut' }} className="w-full max-w-md mx-auto text-center">
      <p className="text-[9px] font-mono uppercase tracking-widest text-primary/50 mb-4">STEP 2 OF 7</p>
      <GlowIcon icon={Lightbulb} />
      <h2 className="text-2xl font-mono font-bold mb-3">Your second brain captures everything.</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Ideas, observations, half-formed thoughts — drop them instantly. No formatting, no friction. The system organizes later.
      </p>
    </motion.div>,

    // Step 2 — EXPAND
    <motion.div key="expand" custom={dir} variants={variants} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.3, ease: 'easeInOut' }} className="w-full max-w-md mx-auto text-center">
      <p className="text-[9px] font-mono uppercase tracking-widest text-primary/50 mb-4">STEP 3 OF 7</p>
      <GlowIcon icon={Sparkles} />
      <h2 className="text-2xl font-mono font-bold mb-3">AI builds your ideas into plans.</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Any idea becomes a full breakdown — opportunities, first steps, risks — in seconds. Expand once, build forever.
      </p>
    </motion.div>,

    // Step 3 — MAP
    <motion.div key="map" custom={dir} variants={variants} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.3, ease: 'easeInOut' }} className="w-full max-w-md mx-auto text-center">
      <p className="text-[9px] font-mono uppercase tracking-widest text-primary/50 mb-4">STEP 4 OF 7</p>
      <GlowIcon icon={Network} />
      <h2 className="text-2xl font-mono font-bold mb-3">Your knowledge forms a living graph.</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        As you add notes, AI finds connections automatically. Your thinking becomes a map you can navigate and build from.
      </p>
    </motion.div>,

    // Step 4 — INTELLIGENCE
    <motion.div key="intel" custom={dir} variants={variants} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.3, ease: 'easeInOut' }} className="w-full max-w-md mx-auto text-center">
      <p className="text-[9px] font-mono uppercase tracking-widest text-primary/50 mb-4">STEP 5 OF 7</p>
      <GlowIcon icon={Zap} />
      <h2 className="text-2xl font-mono font-bold mb-3">It learns how you think.</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Patterns. Blind spots. Trajectory. The system reads your behavior and surfaces what matters — without being asked.
      </p>
    </motion.div>,

    // Step 5 — LOCK-IN (visual demo)
    <motion.div key="lockin" custom={dir} variants={variants} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.3, ease: 'easeInOut' }} className="w-full max-w-md mx-auto text-center">
      <p className="text-[9px] font-mono uppercase tracking-widest text-primary/50 mb-4">STEP 6 OF 7</p>
      <motion.div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center"
        animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2.5, repeat: Infinity }}>
        <motion.div className="absolute inset-0 rounded-full bg-green-500/15 blur-xl"
          animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
        <div className="relative w-16 h-16 rounded-full border border-green-500/30 bg-green-500/5 flex items-center justify-center">
          <Lock className="w-8 h-8 text-green-400" />
        </div>
      </motion.div>
      <h2 className="text-2xl font-mono font-bold mb-3">Lock-In to execute.</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Activate deep focus. The system enforces your topic, tracks drift, and escalates pressure until you ship.
      </p>
      <motion.div className="mt-4 mx-auto w-fit border border-green-500/30 bg-green-500/5 rounded-sm px-4 py-2"
        animate={{ boxShadow: ['0 0 8px rgba(34,197,94,0.3)', '0 0 20px rgba(34,197,94,0.7)', '0 0 8px rgba(34,197,94,0.3)'] }}
        transition={{ duration: 2, repeat: Infinity }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[8px] font-mono font-bold text-green-400 uppercase tracking-widest">LOCK-IN ACTIVE</span>
        </div>
      </motion.div>
    </motion.div>,

    // Step 6 — READY
    <motion.div key="ready" custom={dir} variants={variants} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.3, ease: 'easeInOut' }} className="w-full max-w-md mx-auto text-center">
      <p className="text-[9px] font-mono uppercase tracking-widest text-primary/50 mb-4">STEP 7 OF 7</p>
      <motion.div className="mb-6" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring' }}>
        <div className="flex justify-center gap-3 mb-4">
          {[Lightbulb, Sparkles, Network, Zap, Lock].map((Icon, i) => (
            <motion.div key={i} className="w-8 h-8 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center"
              animate={{ scale: [1, 1.2, 1] }} transition={{ delay: i * 0.1, duration: 0.5 }}>
              <Icon className="w-4 h-4 text-primary/70" />
            </motion.div>
          ))}
        </div>
      </motion.div>
      <h2 className="text-3xl font-mono font-bold mb-2">You're ready.</h2>
      <p className="text-sm text-muted-foreground mb-8">Start capturing. The system learns as you use it.</p>
      <motion.button onClick={onComplete}
        className="px-10 py-3 font-mono font-bold text-sm border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 rounded-sm transition-all"
        whileHover={{ boxShadow: '0 0 24px hsl(var(--primary)/0.4)', scale: 1.02 }}
        whileTap={{ scale: 0.98 }}>
        Begin →
      </motion.button>
    </motion.div>,
  ]

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Skip */}
      {step < TOTAL_STEPS - 1 && (
        <motion.button onClick={onComplete} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="absolute top-4 right-4 text-[9px] font-mono text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors z-10">
          skip
        </motion.button>
      )}

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <AnimatePresence mode="wait" custom={dir}>
          {stepContent[step]}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="p-6">
        {/* Step dots */}
        <div className="flex justify-center gap-1.5 mb-6">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <motion.div key={i}
              className={`rounded-full transition-all ${i === step ? 'w-4 h-1.5 bg-primary' : i < step ? 'w-1.5 h-1.5 bg-primary/40' : 'w-1.5 h-1.5 bg-muted'}`}
              layout
            />
          ))}
        </div>

        {/* Back / Next row */}
        {step > 0 && step < TOTAL_STEPS - 1 && (
          <div className="flex items-center justify-between max-w-md mx-auto">
            <button onClick={goPrev}
              className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors">
              <ChevronLeft className="w-3 h-3" /> back
            </button>
            {step !== 0 && (
              <button onClick={goNext}
                className="text-[9px] font-mono text-primary/60 hover:text-primary/90 transition-colors uppercase tracking-widest">
                next →
              </button>
            )}
          </div>
        )}

        {/* Step 0 "back" — nothing (first step) */}
        {step === 0 && !captured && (
          <p className="text-center text-[8px] font-mono text-muted-foreground/20">press enter to capture</p>
        )}
      </div>
    </div>
  )
}

// Keep FeatureTooltip for other uses
interface FeatureTooltipProps {
  show: boolean
  onDismiss: () => void
  title: string
  description: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export function FeatureTooltip({ show, onDismiss, title, description, position = 'bottom' }: FeatureTooltipProps) {
  const positions = { top: 'bottom-full mb-2', bottom: 'top-full mt-2', left: 'right-full mr-2', right: 'left-full ml-2' }
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
          className={`absolute ${positions[position]} z-50 w-64`}>
          <div className="bg-primary text-primary-foreground p-4 rounded-lg shadow-lg">
            <div>
              <h4 className="font-semibold mb-1">{title}</h4>
              <p className="text-sm text-primary-foreground/80">{description}</p>
            </div>
            <button onClick={onDismiss} className="mt-3 text-sm underline hover:no-underline">Got it!</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
