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
import { selectIdentityTitle } from '@/state/slices/identitySlice'
import { selectCurrentNextMove } from '@/state/slices/nextMoveSlice'
import { cn } from '@/lib/utils'

const pageTitles: Record<string, string> = {
  '/dashboard':            'Dashboard',
  '/live-assistant':       'Think with AI',
  '/knowledge':            'Ideas',
  '/knowledge/ideas':      'Expand Ideas',
  '/knowledge/research':   'Research',
  '/knowledge/timeline':   'Timeline',
  '/knowledge/graph':      'Knowledge Map',
  '/insights':             'Insights',
  '/settings':             'Settings',
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
  const identityTitle = useAppSelector(selectIdentityTitle)

  const getTitle = () => {
    for (const [path, title] of Object.entries(pageTitles)) {
      if (pathname.startsWith(path)) return title
    }
    return 'Thinking Partner'
  }

  const getInitials = () => {
    if (!user?.email) return 'U'
    return user.email.charAt(0).toUpperCase()
  }

  return (
    <header className="sticky top-0 z-40 safe-top">
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

      <div className="bg-card/60 backdrop-blur-xl border-b border-border/30">
        <div className="flex h-12 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-foreground tracking-tight">
              {getTitle()}
            </h1>
            <span className="hidden md:inline-flex text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              {identityTitle}
            </span>
          </div>

          {/* Cognitive status indicators — desktop only */}
          <div className="hidden md:flex items-center gap-2 flex-1 px-4 overflow-hidden">
            <span className={cn(
              'text-[10px] font-medium border rounded-full px-2.5 py-0.5 shrink-0',
              cognitiveState === 'drifting' ? 'border-destructive/30 text-destructive/70 bg-destructive/5' :
              cognitiveState === 'executing' ? 'border-green-500/30 text-green-500/70 bg-green-500/5' :
              cognitiveState === 'overwhelmed' ? 'border-amber-500/30 text-amber-500/70 bg-amber-500/5' :
              'border-primary/20 text-primary/60 bg-primary/5'
            )}>
              {cognitiveState} · {momentumScore} {momentumTrend === 'up' ? '↑' : momentumTrend === 'down' ? '↓' : '→'}
            </span>

            {currentNextMove && (
              <span className="text-[10px] text-muted-foreground/50 truncate max-w-[180px]">
                → {currentNextMove.text}
              </span>
            )}

            {streak > 0 && (
              <span className="text-[10px] text-muted-foreground/30 shrink-0">
                {streak}d streak
              </span>
            )}

            <button
              onClick={() => dispatch(toggleFocusMode())}
              className={cn(
                'text-[10px] font-medium border rounded-full px-2.5 py-0.5 shrink-0 transition-all',
                isFocusMode
                  ? 'border-primary/40 text-primary bg-primary/10'
                  : 'border-border/50 text-muted-foreground/40 hover:border-primary/30 hover:text-primary/60 hover:bg-primary/5'
              )}
            >
              {isFocusMode ? '● Focus' : 'Focus'}
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
                <Avatar className="relative h-7 w-7 border border-border/50 group-hover:border-primary/50 transition-colors rounded-full ring-2 ring-transparent group-hover:ring-primary/20">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold rounded-full">
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
