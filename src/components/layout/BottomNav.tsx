'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Calendar,
  Flame,
  UtensilsCrossed,
  MessageCircle,
  Home,
  ListTodo,
  Grid3X3,
  FolderKanban,
  Timer,
  FileText,
  Zap,
  Calculator,
  BarChart3,
  ScrollText,
  Brain,
  Lightbulb,
  Settings,
  X,
  ShoppingCart,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

const primaryNav = [
  { href: '/dashboard',     icon: Home,          label: 'Base' },
  { href: '/tasks',         icon: ListTodo,      label: 'Missions' },
  { href: '/habits',        icon: Flame,         label: 'Protocols' },
  { href: '/live-assistant', icon: MessageCircle, label: 'Intel' },
]

const moreSections = [
  {
    label: 'Core',
    items: [
      { href: '/calendar',   icon: Calendar,      label: 'Calendar' },
      { href: '/projects',   icon: FolderKanban,  label: 'Projects' },
    ],
  },
  {
    label: 'Productivity',
    items: [
      { href: '/time-tracking', icon: Timer,    label: 'Time Tracking' },
      { href: '/docs',          icon: FileText, label: 'Docs' },
      { href: '/automations',   icon: Zap,      label: 'Automations' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { href: '/math',                 icon: Calculator,      label: 'Study Assistant' },
      { href: '/meal-planning',        icon: UtensilsCrossed, label: 'Meals' },
      { href: '/shopping-list',        icon: ShoppingCart,    label: 'Shopping' },
      { href: '/thought-organization', icon: Lightbulb,       label: 'Thoughts' },
    ],
  },
  {
    label: 'AI & Intel',
    items: [
      { href: '/ai-decisions', icon: ScrollText, label: 'AI Decisions' },
      { href: '/progress',     icon: BarChart3,  label: 'Progress' },
      { href: '/insights',     icon: Brain,      label: 'Insights' },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
]

export function BottomNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="bg-background/95 backdrop-blur-xl border-t border-border/50 safe-bottom">
          <div className="flex h-14 items-center justify-around px-2">
            {primaryNav.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'relative flex flex-col items-center justify-center gap-0.5 px-3 py-2 touch-target transition-all duration-200',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground active:scale-95'
                  )}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-primary/8" />
                  )}
                  <div className={cn(
                    'relative z-10 p-1 transition-all duration-200',
                    isActive && 'bg-primary/15'
                  )}>
                    <item.icon className={cn(
                      'h-4 w-4 transition-all duration-200',
                      isActive && 'drop-shadow-[0_0_6px_hsl(17,100%,56%)]'
                    )} />
                  </div>
                  <span className={cn(
                    'relative z-10 text-[9px] font-mono font-semibold uppercase tracking-wider transition-all duration-200',
                    isActive ? 'text-primary' : 'text-muted-foreground/70'
                  )}>
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary" />
                  )}
                </Link>
              )
            })}

            {/* More button */}
            <button
              onClick={() => setMoreOpen((v) => !v)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 px-3 py-2 touch-target transition-all duration-200',
                moreOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground active:scale-95'
              )}
            >
              {moreOpen && <div className="absolute inset-0 bg-primary/8" />}
              <div className={cn('relative z-10 p-1 transition-all duration-200', moreOpen && 'bg-primary/15')}>
                {moreOpen
                  ? <X className="h-4 w-4 drop-shadow-[0_0_6px_hsl(17,100%,56%)]" />
                  : <Grid3X3 className="h-4 w-4" />
                }
              </div>
              <span className={cn(
                'relative z-10 text-[9px] font-mono font-semibold uppercase tracking-wider transition-all duration-200',
                moreOpen ? 'text-primary' : 'text-muted-foreground/70'
              )}>
                More
              </span>
              {moreOpen && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* More drawer */}
      <AnimatePresence>
        {moreOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
            />

            {/* Slide-up panel */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-14 left-0 right-0 z-40 md:hidden bg-background border-t border-border/50 rounded-t-sm max-h-[75vh] overflow-y-auto"
            >
              {/* Handle */}
              <div className="flex justify-center py-2">
                <div className="w-8 h-0.5 bg-border/60 rounded-full" />
              </div>

              <div className="px-4 pb-6 space-y-4">
                {moreSections.map((section) => (
                  <div key={section.label}>
                    <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground/40 mb-1.5 px-1">
                      {section.label}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {section.items.map((item) => {
                        const isActive = pathname === item.href ||
                          (item.href !== '/dashboard' && pathname.startsWith(item.href))
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMoreOpen(false)}
                            className={cn(
                              'flex flex-col items-center gap-1.5 p-3 border transition-all duration-200 active:scale-95',
                              isActive
                                ? 'border-primary/40 bg-primary/8 text-primary'
                                : 'border-border/40 bg-card/50 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                            )}
                          >
                            <item.icon className={cn('h-5 w-5', isActive && 'drop-shadow-[0_0_6px_hsl(17,100%,56%)]')} />
                            <span className="text-[9px] font-mono font-semibold uppercase tracking-wider text-center leading-tight">
                              {item.label}
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
