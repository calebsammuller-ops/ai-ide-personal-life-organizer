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
import { selectIsSidebarCollapsed, toggleSidebar } from '@/state/slices/uiSlice'

const navSections = [
  {
    label: 'Ideas',
    items: [
      { href: '/knowledge',          icon: Brain,     label: 'All Ideas' },
      { href: '/knowledge/ideas',    icon: Lightbulb, label: 'Expand Ideas' },
      { href: '/knowledge/research', icon: Search,    label: 'Research' },
      { href: '/knowledge/timeline', icon: Clock,     label: 'Timeline' },
    ],
  },
  {
    label: 'Graph',
    items: [
      { href: '/knowledge/graph', icon: Network, label: 'Knowledge Graph' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { href: '/insights',         icon: Sparkles,      label: 'AI Insights' },
      { href: '/live-assistant',   icon: MessageCircle, label: 'Thinking Partner' },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const dispatch = useAppDispatch()
  const isCollapsed = useAppSelector(selectIsSidebarCollapsed)

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col bg-background h-screen sticky top-0 transition-all duration-300 border-r border-border/50',
        isCollapsed ? 'w-14' : 'w-60'
      )}
    >
      {/* Logo / Header */}
      <div className="flex h-12 items-center justify-between border-b border-border/50 px-3">
        {!isCollapsed && (
          <Link href="/knowledge" className="flex items-center gap-2">
            <div className="h-7 w-7 bg-primary/90 flex items-center justify-center flex-shrink-0">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-foreground/70">
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
              <p className="px-3 py-1 text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground/35">
                {section.label}
              </p>
            )}
            {isCollapsed && <div className="h-px bg-border/30 mx-2 my-1" />}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/knowledge' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-1.5 transition-colors',
                      !isCollapsed && 'border-l-2',
                      isActive
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-transparent text-muted-foreground hover:bg-primary/5 hover:text-foreground hover:border-primary/25',
                      isCollapsed && 'justify-center px-2'
                    )}
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
      <div className="border-t border-border/50 p-2">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-2.5 px-3 py-1.5 transition-colors',
            !isCollapsed && 'border-l-2',
            pathname.startsWith('/settings')
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-transparent text-muted-foreground hover:bg-primary/5 hover:text-foreground hover:border-primary/25',
            isCollapsed && 'justify-center px-2'
          )}
          title={isCollapsed ? 'Settings' : undefined}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span className="text-xs font-mono">Settings</span>}
        </Link>
      </div>
    </aside>
  )
}
