'use client'

import { motion, AnimatePresence, HTMLMotionProps } from 'framer-motion'
import { ReactNode } from 'react'

// Page transition wrapper
interface PageTransitionProps {
  children: ReactNode
  className?: string
}

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Staggered list animation
interface StaggeredListProps {
  children: ReactNode[]
  className?: string
  delay?: number
}

export function StaggeredList({ children, className = '', delay = 0.1 }: StaggeredListProps) {
  return (
    <motion.div className={className}>
      {children.map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * delay, duration: 0.3 }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}

// Fade in component
interface FadeInProps extends HTMLMotionProps<'div'> {
  children: ReactNode
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
}

export function FadeIn({
  children,
  delay = 0,
  direction = 'up',
  className = '',
  ...props
}: FadeInProps) {
  const directions = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
    none: {},
  }

  return (
    <motion.div
      initial={{ opacity: 0, ...directions[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Scale in component
interface ScaleInProps {
  children: ReactNode
  delay?: number
  className?: string
}

export function ScaleIn({ children, delay = 0, className = '' }: ScaleInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Hover card effect
interface HoverCardProps {
  children: ReactNode
  className?: string
}

export function HoverCard({ children, className = '' }: HoverCardProps) {
  return (
    <motion.div
      whileHover={{
        scale: 1.02,
        boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.2)',
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Animated button
interface AnimatedButtonProps extends HTMLMotionProps<'button'> {
  children: ReactNode
  variant?: 'default' | 'pulse' | 'bounce'
}

export function AnimatedButton({
  children,
  variant = 'default',
  className = '',
  ...props
}: AnimatedButtonProps) {
  const variants = {
    default: {
      whileHover: { scale: 1.05 },
      whileTap: { scale: 0.95 },
    },
    pulse: {
      animate: { scale: [1, 1.05, 1] },
      transition: { duration: 2, repeat: Infinity },
    },
    bounce: {
      whileHover: { y: -5 },
      whileTap: { y: 0 },
    },
  }

  return (
    <motion.button
      {...variants[variant]}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  )
}

// Animated counter
interface AnimatedCounterProps {
  value: number
  className?: string
  duration?: number
}

export function AnimatedCounter({ value, className = '', duration = 1 }: AnimatedCounterProps) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration }}
      >
        {value}
      </motion.span>
    </motion.span>
  )
}

// Progress bar with animation
interface AnimatedProgressProps {
  value: number
  max?: number
  className?: string
  showLabel?: boolean
}

export function AnimatedProgress({
  value,
  max = 100,
  className = '',
  showLabel = false,
}: AnimatedProgressProps) {
  const percentage = Math.min((value / max) * 100, 100)

  return (
    <div className={`relative ${className}`}>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full"
        />
      </div>
      {showLabel && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute right-0 -top-6 text-sm text-muted-foreground"
        >
          {Math.round(percentage)}%
        </motion.span>
      )}
    </div>
  )
}

// Animated checkbox
interface AnimatedCheckboxProps {
  checked: boolean
  onChange: () => void
  label?: string
  className?: string
}

export function AnimatedCheckbox({
  checked,
  onChange,
  label,
  className = '',
}: AnimatedCheckboxProps) {
  return (
    <motion.label
      className={`flex items-center gap-2 cursor-pointer ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          checked ? 'bg-primary border-primary' : 'border-muted-foreground'
        }`}
        onClick={onChange}
        animate={checked ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 0.2 }}
      >
        <AnimatePresence>
          {checked && (
            <motion.svg
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="w-3 h-3 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <motion.path
                d="M5 12l5 5L20 7"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3 }}
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.div>
      {label && <span className={checked ? 'line-through text-muted-foreground' : ''}>{label}</span>}
    </motion.label>
  )
}

// Floating action button
interface FloatingButtonProps {
  children: ReactNode
  onClick: () => void
  className?: string
}

export function FloatingButton({ children, onClick, className = '' }: FloatingButtonProps) {
  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-40 ${className}`}
    >
      {children}
    </motion.button>
  )
}

// Slide in panel
interface SlidePanelProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  side?: 'left' | 'right'
}

export function SlidePanel({ isOpen, onClose, children, side = 'right' }: SlidePanelProps) {
  const slideFrom = side === 'right' ? '100%' : '-100%'

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />
          <motion.div
            initial={{ x: slideFrom }}
            animate={{ x: 0 }}
            exit={{ x: slideFrom }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed top-0 ${side}-0 h-full w-80 bg-background shadow-xl z-50 p-4`}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
