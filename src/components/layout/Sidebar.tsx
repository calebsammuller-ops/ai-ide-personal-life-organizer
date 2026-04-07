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
    label: 'Home',
    items: [
      { href: '/dashboard',      icon: Brain,          label: 'Dashboard' },
      { href: '/live-assistant', icon: MessageCircle,  label: 'Think with AI' },
    ],
  },
  {
    label: 'Capture',
    items: [
      { href: '/knowledge',          icon: Lightbulb, label: 'Ideas' },
      { href: '/knowledge/research', icon: Search,    label: 'Research' },
    ],
  },
  {
    label: 'Develop',
    items: [
      { href: '/knowledge/ideas', icon: Sparkles, label: 'Expand Ideas' },
    ],
  },
  {
    label: 'Knowledge',
    items: [
      { href: '/knowledge/graph',    icon: Network, label: 'Knowledge Map' },
      { href: '/knowledge/timeline', icon: Clock,   label: 'Timeline' },
    ],
  },
  {
    label: 'Intelligence',
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
        'hidden md:flex flex-col h-screen sticky top-0 transition-all duration-300 border-r border-border/40',
        'bg-card/50 backdrop-blur-sm',
        isCollapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Logo / Header */}
      <div className="flex h-12 items-center justify-between border-b border-border/50 px-3">
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-7 w-7 bg-primary/90 rounded-lg flex items-center justify-center flex-shrink-0">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <span className="text-xs font-semibold text-foreground/80">
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
              <p className="px-3 py-1 text-[10px] font-medium text-muted-foreground/35 uppercase tracking-wider">
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
                      'fade-in-up flex items-center gap-2.5 px-3 py-2 rounded-lg mx-1 transition-all duration-200',
                      isActive
                        ? 'bg-primary/15 text-primary shadow-sm shadow-primary/10'
                        : 'text-muted-foreground/70 hover:bg-white/5 hover:text-foreground',
                      isCollapsed && 'justify-center px-2 mx-0'
                    )}
                    style={{ animationDelay: `${index * 30}ms` }}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!isCollapsed && (
                      <span className="text-xs">{item.label}</span>
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
            'flex items-center gap-2.5 px-3 py-2 rounded-lg mx-1 transition-all duration-200',
            pathname.startsWith('/settings')
              ? 'bg-primary/15 text-primary shadow-sm shadow-primary/10'
              : 'text-muted-foreground/70 hover:bg-white/5 hover:text-foreground',
            isCollapsed && 'justify-center px-2 mx-0'
          )}
          title={isCollapsed ? 'Settings' : undefined}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span className="text-xs">Settings</span>}
        </Link>
        {!isCollapsed && (
          lockInActive ? (
            <div className="lock-in-badge mx-0 mb-1 rounded-lg border border-green-500/30 bg-green-500/5 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-semibold text-green-400">LOCK-IN ACTIVE</span>
              </div>
              {lockInFocus && (
                <p className="text-[9px] text-green-500/50 mt-0.5 truncate">{lockInFocus}</p>
              )}
              <button
                onClick={() => dispatch(deactivateLockIn())}
                className="mt-1.5 w-full text-[9px] text-destructive/50 hover:text-destructive/80 border border-destructive/20 rounded-lg py-0.5 transition-colors"
              >
                EXIT LOCK-IN
              </button>
            </div>
          ) : (
            <button
              onClick={() => dispatch(openModal({ modalName: 'lockIn' }))}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 border-l-2 border-transparent text-primary/40 hover:text-primary/70 text-[10px] transition-colors"
            >
              LOCK-IN MODE
            </button>
          )
        )}
      </div>
    </aside>
  )
}
