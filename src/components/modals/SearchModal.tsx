'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Target,
  CheckSquare,
  Calendar,
  X,
  Command,
  ArrowRight,
  Clock,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppSelector, useAppDispatch } from '@/state/hooks'
import { selectActiveHabits } from '@/state/slices/habitsSlice'
import { selectAllTasks } from '@/state/slices/tasksSlice'
import { selectAllEvents } from '@/state/slices/calendarSlice'
import { openModal, closeModal, setSearchOpen, selectIsSearchOpen } from '@/state/slices/uiSlice'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface SearchResult {
  id: string
  type: 'habit' | 'task' | 'event' | 'action'
  title: string
  description?: string
  icon: React.ReactNode
  color: string
  action: () => void
}

export function SearchModal() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const isOpen = useAppSelector(selectIsSearchOpen)
  const habits = useAppSelector(selectActiveHabits)
  const tasks = useAppSelector(selectAllTasks)
  const events = useAppSelector(selectAllEvents)

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Quick actions
  const quickActions: SearchResult[] = [
    {
      id: 'new-habit',
      type: 'action',
      title: 'Create new habit',
      description: 'Add a new habit to your skill tree',
      icon: <Target className="h-4 w-4" />,
      color: 'text-blue-500 bg-blue-500/10',
      action: () => {
        dispatch(setSearchOpen(false))
        dispatch(openModal({ modalName: 'createHabit' }))
      },
    },
    {
      id: 'new-event',
      type: 'action',
      title: 'Create new event',
      description: 'Schedule an event on your calendar',
      icon: <Calendar className="h-4 w-4" />,
      color: 'text-green-500 bg-green-500/10',
      action: () => {
        dispatch(setSearchOpen(false))
        dispatch(openModal({ modalName: 'createEvent' }))
      },
    },
    {
      id: 'go-calendar',
      type: 'action',
      title: 'Go to Calendar',
      icon: <Calendar className="h-4 w-4" />,
      color: 'text-purple-500 bg-purple-500/10',
      action: () => {
        dispatch(setSearchOpen(false))
        router.push('/calendar')
      },
    },
    {
      id: 'go-habits',
      type: 'action',
      title: 'Go to Skill Tree',
      icon: <Target className="h-4 w-4" />,
      color: 'text-blue-500 bg-blue-500/10',
      action: () => {
        dispatch(setSearchOpen(false))
        router.push('/habits')
      },
    },
    {
      id: 'go-tasks',
      type: 'action',
      title: 'Go to Tasks',
      icon: <CheckSquare className="h-4 w-4" />,
      color: 'text-orange-500 bg-orange-500/10',
      action: () => {
        dispatch(setSearchOpen(false))
        router.push('/tasks')
      },
    },
  ]

  // Search results
  const getSearchResults = useCallback((): SearchResult[] => {
    if (!query.trim()) {
      return quickActions
    }

    const lowerQuery = query.toLowerCase()
    const results: SearchResult[] = []

    // Search habits
    habits.forEach((habit) => {
      if (
        habit.name.toLowerCase().includes(lowerQuery) ||
        habit.description?.toLowerCase().includes(lowerQuery) ||
        habit.category?.toLowerCase().includes(lowerQuery)
      ) {
        results.push({
          id: `habit-${habit.id}`,
          type: 'habit',
          title: habit.name,
          description: habit.category || habit.frequency,
          icon: <span className="text-lg">{habit.icon}</span>,
          color: 'text-blue-500 bg-blue-500/10',
          action: () => {
            dispatch(setSearchOpen(false))
            dispatch(openModal({ modalName: 'habitPlan', data: { habit } }))
          },
        })
      }
    })

    // Search tasks
    tasks.forEach((task) => {
      if (
        task.title.toLowerCase().includes(lowerQuery) ||
        task.description?.toLowerCase().includes(lowerQuery)
      ) {
        results.push({
          id: `task-${task.id}`,
          type: 'task',
          title: task.title,
          description: task.status === 'completed' ? 'Completed' : task.priority,
          icon: <CheckSquare className="h-4 w-4" />,
          color: 'text-orange-500 bg-orange-500/10',
          action: () => {
            dispatch(setSearchOpen(false))
            router.push('/tasks')
          },
        })
      }
    })

    // Search events
    events.forEach((event) => {
      if (
        event.title?.toLowerCase().includes(lowerQuery) ||
        event.description?.toLowerCase().includes(lowerQuery) ||
        event.location?.toLowerCase().includes(lowerQuery)
      ) {
        results.push({
          id: `event-${event.id}`,
          type: 'event',
          title: event.title || 'Event',
          description: new Date(event.startTime).toLocaleDateString(),
          icon: <Calendar className="h-4 w-4" />,
          color: 'text-green-500 bg-green-500/10',
          action: () => {
            dispatch(setSearchOpen(false))
            router.push('/calendar')
          },
        })
      }
    })

    // Filter matching quick actions
    const matchingActions = quickActions.filter((action) =>
      action.title.toLowerCase().includes(lowerQuery)
    )

    return [...results, ...matchingActions].slice(0, 10)
  }, [query, habits, tasks, events, dispatch, router, quickActions])

  const results = getSearchResults()

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % results.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + results.length) % results.length)
          break
        case 'Enter':
          e.preventDefault()
          if (results[selectedIndex]) {
            results[selectedIndex].action()
          }
          break
        case 'Escape':
          dispatch(setSearchOpen(false))
          break
      }
    },
    [results, selectedIndex, dispatch]
  )

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
    }
  }, [isOpen])

  // Global keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        dispatch(setSearchOpen(!isOpen))
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isOpen, dispatch])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => dispatch(setSearchOpen(open))}>
      <DialogContent className="sm:max-w-[550px] p-0 gap-0 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search habits, tasks, events..."
            className="border-0 shadow-none focus-visible:ring-0 text-base placeholder:text-muted-foreground/60"
          />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
              {typeof window !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">K</kbd>
          </div>
        </div>

        {/* Results */}
        <ScrollArea className="max-h-[400px]">
          <div className="p-2">
            {!query.trim() && (
              <p className="text-xs text-muted-foreground px-2 py-1 mb-1">
                Quick Actions
              </p>
            )}
            {query.trim() && results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No results found</p>
                <p className="text-sm text-muted-foreground/70">Try a different search term</p>
              </div>
            )}
            <AnimatePresence>
              {results.map((result, index) => (
                <motion.button
                  key={result.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={result.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                    index === selectedIndex
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted/50'
                  )}
                >
                  <div className={cn('p-2 rounded-lg', result.color)}>
                    {result.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{result.title}</p>
                    {result.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {result.description}
                      </p>
                    )}
                  </div>
                  {index === selectedIndex && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">↵</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Esc</kbd>
              Close
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
