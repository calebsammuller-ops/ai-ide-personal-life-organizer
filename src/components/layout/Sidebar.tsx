'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Brain,
  Lightbulb,
  MessageCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Network,
  Sparkles,
  Clock,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAppSelector, useAppDispatch } from '@/state/hooks'
import { selectIsSidebarCollapsed, toggleSidebar, openModal } from '@/state/slices/uiSlice'
import { selectLockInActive, selectLockInFocus, deactivateLockIn } from '@/state/slices/lockInSlice'

const navSections = [
  {
    label: 'COMMAND',
    items: [
      { href: '/dashboard',      icon: Brain,          label: 'Command Center' },
      { href: '/live-assistant', icon: MessageCircle,  label: 'Thinking Partner' },
    ],
  },
  {
    label: 'CAPTURE',
    items: [
      { href: '/knowledge',          icon: Lightbulb, label: 'Ideas' },
      { href: '/knowledge/research', icon: Search,    label: 'Research' },
    ],
  },
  {
    label: 'DEVELOP',
    items: [
      { href: '/knowledge/ideas', icon: Sparkles, label: 'Expand Ideas' },
    ],
  },
  {
    label: 'KNOWLEDGE',
    items: [
      { href: '/knowledge/graph',    icon: Network, label: 'Knowledge Map' },
      { href: '/knowledge/timeline', icon: Clock,   label: 'Timeline' },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { href: '/insights', icon: Brain, label: 'AI Insights' },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const dispatch = useAppDispatch()
  const isCollapsed = useAppSelector(selectIsSidebarCollapsed)
  const lockInActive = useAppSelector(selectLockInActive)
  const lockInFocus = useAppSelector(selectLockInFocus)

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-screen sticky top-0 transition-all duration-300 border-r border-border/50',
        'bg-[hsl(15_8%_2%)]',
        isCollapsed ? 'w-14' : 'w-60'
      )}
    >
      {/* Logo / Header */}
      <div className="flex h-12 items-center justify-between border-b border-border/50 px-3">
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-7 w-7 bg-primary/90 flex items-center justify-center flex-shrink-0">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.25em] text-primary/65">
              Thinking Partner
            </span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => dispatch(toggleSidebar())}
          className={cn('h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10', isCollapsed && 'mx-auto')}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-3 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            {!isCollapsed && (
              <p className="px-3 py-1 text-[9px] font-mono font-bold uppercase tracking-[0.22em] text-muted-foreground/22">
                {section.label}
              </p>
            )}
            {isCollapsed && <div className="h-px bg-primary/10 mx-2 my-1" />}
            <div className="space-y-0.5">
              {section.items.map((item, index) => {
                const isActive = pathname === item.href || (item.href !== '/knowledge' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'fade-in-up flex items-center gap-2.5 px-3 py-1.5 transition-colors',
                      !isCollapsed && 'border-l-2',
                      isActive
                        ? 'nav-active-glow border-primary bg-primary/[0.06] text-primary'
                        : 'border-transparent text-muted-foreground hover:bg-primary/[0.04] hover:text-foreground hover:border-primary/35',
                      isCollapsed && 'justify-center px-2'
                    )}
                    style={{ animationDelay: `${index * 30}ms` }}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!isCollapsed && (
                      <span className="text-xs font-mono">{item.label}</span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border/50 p-2 space-y-0.5">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-2.5 px-3 py-1.5 transition-colors',
            !isCollapsed && 'border-l-2',
            pathname.startsWith('/settings')
              ? 'nav-active-glow border-primary bg-primary/[0.06] text-primary'
              : 'border-transparent text-muted-foreground hover:bg-primary/[0.04] hover:text-foreground hover:border-primary/35',
            isCollapsed && 'justify-center px-2'
          )}
          title={isCollapsed ? 'Settings' : undefined}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span className="text-xs font-mono">Settings</span>}
        </Link>
        {!isCollapsed && (
          lockInActive ? (
            <div className="lock-in-badge mx-0 mb-1 rounded-sm border border-green-500/30 bg-green-500/5 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[8px] font-mono font-bold text-green-400 uppercase tracking-widest">LOCK-IN ACTIVE</span>
              </div>
              {lockInFocus && (
                <p className="text-[7px] font-mono text-green-500/50 mt-0.5 truncate">{lockInFocus}</p>
              )}
              <button
                onClick={() => dispatch(deactivateLockIn())}
                className="mt-1.5 w-full text-[7px] font-mono text-destructive/50 hover:text-destructive/80 border border-destructive/20 rounded-sm py-0.5 transition-colors"
              >
                EXIT LOCK-IN
              </button>
            </div>
          ) : (
            <button
              onClick={() => dispatch(openModal({ modalName: 'lockIn' }))}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 border-l-2 border-transparent text-primary/40 hover:text-primary/70 text-[9px] font-mono transition-colors"
            >
              LOCK-IN MODE
            </button>
          )
        )}
      </div>
    </aside>
  )
}
