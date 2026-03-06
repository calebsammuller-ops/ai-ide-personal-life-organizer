'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Search, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAppSelector, useAppDispatch } from '@/state/hooks'
import { selectUser } from '@/state/slices/authSlice'
import { setSearchOpen, openModal } from '@/state/slices/uiSlice'

const pageTitles: Record<string, string> = {
  '/dashboard':            'COMMAND CENTER',
  '/calendar':             'CALENDAR',
  '/habits':               'PROTOCOLS',
  '/tasks':                'MISSIONS',
  '/projects':             'PROJECTS',
  '/time-tracking':        'TIME TRACKING',
  '/live-assistant':       'STRATEGIST',
  '/meal-planning':        'NUTRITION',
  '/thought-organization': 'MIND MAP',
  '/math':                 'STUDY ASSISTANT',
  '/docs':                 'DOCS',
  '/automations':          'AUTOMATIONS',
  '/progress':             'PROGRESS',
  '/insights':             'INTEL',
  '/ai-decisions':         'AI DECISIONS',
  '/settings':             'SETTINGS',
}

export function Header() {
  const pathname = usePathname()
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectUser)

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
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="bg-background/90 backdrop-blur-xl">
        <div className="flex h-12 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-4 bg-primary" />
            <h1 className="text-xs font-bold tracking-widest uppercase text-foreground font-mono">
              {getTitle()}
            </h1>
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
