'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Brain, Network, MessageCircle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const primaryNav = [
  { href: '/knowledge',        icon: Brain,         label: 'Ideas' },
  { href: '/knowledge/graph',  icon: Network,       label: 'Graph' },
  { href: '/insights',         icon: Sparkles,      label: 'Insights' },
  { href: '/live-assistant',   icon: MessageCircle, label: 'Think' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="bg-background/95 backdrop-blur-xl border-t border-border/50 safe-bottom">
        <div className="flex h-14 items-center justify-around px-2">
          {primaryNav.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/knowledge' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 px-3 py-2 transition-all duration-200',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground active:scale-90'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="bottomNavActive"
                    className="absolute inset-0 bg-primary/8 rounded-md"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <div className={cn('relative z-10 p-1 transition-all duration-200', isActive && 'bg-primary/15 rounded')}>
                  <item.icon className={cn(
                    'h-4 w-4 transition-all duration-200',
                    isActive && 'drop-shadow-[0_0_6px_hsl(var(--primary)/0.6)]'
                  )} />
                </div>
                <span className={cn(
                  'relative z-10 text-[9px] font-mono font-semibold uppercase tracking-wider',
                  isActive ? 'text-primary' : 'text-muted-foreground/70'
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
