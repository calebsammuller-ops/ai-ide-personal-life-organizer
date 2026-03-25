'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Search, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAppSelector, useAppDispatch } from '@/state/hooks'
import { selectUser } from '@/state/slices/authSlice'
import { setSearchOpen, openModal, selectIsFocusModeActive, toggleFocusMode } from '@/state/slices/uiSlice'
import { selectCognitiveState } from '@/state/slices/cognitiveStateSlice'
import { selectMomentumScore, selectMomentumTrend, selectMomentumStreak } from '@/state/slices/momentumSlice'
import { selectCurrentNextMove } from '@/state/slices/nextMoveSlice'
import { cn } from '@/lib/utils'

const pageTitles: Record<string, string> = {
  '/dashboard':            'COMMAND CENTER',
  '/live-assistant':       'THINKING PARTNER',
  '/knowledge':            'CAPTURE',
  '/knowledge/ideas':      'EXPAND IDEAS',
  '/knowledge/research':   'RESEARCH',
  '/knowledge/timeline':   'TIMELINE',
  '/knowledge/graph':      'KNOWLEDGE MAP',
  '/insights':             'INTEL',
  '/settings':             'SETTINGS',
}

export function Header() {
  const pathname = usePathname()
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectUser)
  const cognitiveState = useAppSelector(selectCognitiveState)
  const momentumScore = useAppSelector(selectMomentumScore)
  const momentumTrend = useAppSelector(selectMomentumTrend)
  const streak = useAppSelector(selectMomentumStreak)
  const currentNextMove = useAppSelector(selectCurrentNextMove)
  const isFocusMode = useAppSelector(selectIsFocusModeActive)

  const getTitle = () => {
    for (const [path, title] of Object.entries(pageTitles)) {
      if (pathname.startsWith(path)) return title
    }
    return 'COMMAND OPS'
  }

  const getInitials = () => {
    if (!user?.email) return 'U'
    return user.email.charAt(0).toUpperCase()
  }

  return (
    <header className="sticky top-0 z-40 safe-top">
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="bg-background/90 backdrop-blur-xl">
        <div className="flex h-12 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-4 bg-primary" />
            <h1 className="text-xs font-bold tracking-widest uppercase text-foreground font-mono">
              {getTitle()}
            </h1>
          </div>

          {/* Cognitive status indicators — desktop only */}
          <div className="hidden md:flex items-center gap-2 flex-1 px-4 overflow-hidden">
            <span className={cn(
              'text-[8px] font-mono uppercase tracking-widest border rounded-sm px-1.5 py-px shrink-0',
              cognitiveState === 'drifting' ? 'border-destructive/40 text-destructive/60' :
              cognitiveState === 'executing' ? 'border-green-500/30 text-green-500/60' :
              cognitiveState === 'overwhelmed' ? 'border-amber-500/30 text-amber-500/60' :
              'border-primary/25 text-primary/50'
            )}>{cognitiveState}: {momentumScore} | momentum {momentumTrend === 'up' ? '↑' : momentumTrend === 'down' ? '↓' : '→'}</span>

            {currentNextMove && (
              <span className="text-[8px] font-mono text-primary/40 truncate max-w-[160px]">
                → {currentNextMove.text}
              </span>
            )}

            {streak > 0 && (
              <span className="text-[8px] font-mono text-muted-foreground/20 shrink-0">
                {streak}d
              </span>
            )}

            <button
              onClick={() => dispatch(toggleFocusMode())}
              className={cn(
                'text-[8px] font-mono uppercase tracking-widest border rounded-sm px-1.5 py-px shrink-0 transition-colors',
                isFocusMode
                  ? 'border-primary/40 text-primary/80 bg-primary/10'
                  : 'border-muted-foreground/20 text-muted-foreground/30 hover:border-primary/30 hover:text-primary/50'
              )}
            >
              {isFocusMode ? '● focus' : 'focus'}
            </button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => dispatch(setSearchOpen(true))}
              className="relative text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all h-8 w-8"
            >
              <Search className="h-4 w-4" />
              <span className="sr-only">Search</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => dispatch(openModal({ modalName: 'notifications' }))}
              className="relative text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all h-8 w-8"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full" />
              <span className="sr-only">Notifications</span>
            </Button>

            <Link href="/settings" className="hidden md:block">
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all h-8 w-8"
              >
                <Settings className="h-4 w-4" />
                <span className="sr-only">Settings</span>
              </Button>
            </Link>

            <Link href="/settings/profile" className="ml-1">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-primary/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Avatar className="relative h-7 w-7 border border-border group-hover:border-primary/50 transition-colors rounded-sm">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-mono font-bold rounded-sm">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
