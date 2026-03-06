'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  searchAll,
  setQuery,
  setIsOpen,
  clearSearch,
  selectSearchQuery,
  selectSearchTasks,
  selectSearchDocuments,
  selectSearchHabits,
  selectIsSearching,
  selectSearchIsOpen,
} from '@/state/slices/searchSlice'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Search,
  FileText,
  CheckSquare,
  Repeat,
  Loader2,
  Command,
} from 'lucide-react'

interface FlatResult {
  id: string
  type: 'task' | 'document' | 'habit'
  title: string
  snippet: string
  url: string
}

const typeIcons = {
  task: CheckSquare,
  document: FileText,
  habit: Repeat,
}

const typeLabels = {
  task: 'Tasks',
  document: 'Documents',
  habit: 'Habits',
}

export function GlobalSearch() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const query = useAppSelector(selectSearchQuery)
  const isSearching = useAppSelector(selectIsSearching)
  const isOpen = useAppSelector(selectSearchIsOpen)
  const taskResults = useAppSelector(selectSearchTasks)
  const docResults = useAppSelector(selectSearchDocuments)
  const habitResults = useAppSelector(selectSearchHabits)

  // Normalize results into flat items with URLs
  const groupedResults = useMemo(() => {
    const groups: { type: 'task' | 'document' | 'habit'; label: string; items: FlatResult[] }[] = []

    if (taskResults.length > 0) {
      groups.push({
        type: 'task',
        label: typeLabels.task,
        items: taskResults.map((t) => ({
          id: t.id,
          type: 'task' as const,
          title: t.title,
          snippet: t.description ?? '',
          url: `/tasks?id=${t.id}`,
        })),
      })
    }

    if (docResults.length > 0) {
      groups.push({
        type: 'document',
        label: typeLabels.document,
        items: docResults.map((d) => ({
          id: d.id,
          type: 'document' as const,
          title: d.title,
          snippet: d.plainText ?? '',
          url: `/docs/${d.id}`,
        })),
      })
    }

    if (habitResults.length > 0) {
      groups.push({
        type: 'habit',
        label: typeLabels.habit,
        items: habitResults.map((h) => ({
          id: h.id,
          type: 'habit' as const,
          title: h.name,
          snippet: `${h.frequency} - ${h.currentStreak} day streak`,
          url: `/habits?id=${h.id}`,
        })),
      })
    }

    return groups
  }, [taskResults, docResults, habitResults])

  const flatResults = useMemo(
    () => groupedResults.flatMap((g) => g.items),
    [groupedResults]
  )

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        dispatch(setIsOpen(!isOpen))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dispatch, isOpen])

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    } else {
      dispatch(clearSearch())
      setSelectedIndex(0)
    }
  }, [isOpen, dispatch])

  // Debounced search
  useEffect(() => {
    if (!query.trim()) return
    const timer = setTimeout(() => {
      dispatch(searchAll(query))
    }, 300)
    return () => clearTimeout(timer)
  }, [query, dispatch])

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [flatResults.length])

  const handleSelect = useCallback(
    (url: string) => {
      dispatch(setIsOpen(false))
      router.push(url)
    },
    [dispatch, router]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, flatResults.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && flatResults[selectedIndex]) {
        e.preventDefault()
        handleSelect(flatResults[selectedIndex].url)
      } else if (e.key === 'Escape') {
        dispatch(setIsOpen(false))
      }
    },
    [flatResults, selectedIndex, handleSelect, dispatch]
  )

  let flatIndex = -1

  return (
    <Dialog open={isOpen} onOpenChange={(open) => dispatch(setIsOpen(open))}>
      <DialogContent
        className={cn(
          'max-w-xl p-0 gap-0 overflow-hidden',
          'border-purple-500/30 bg-background/95 backdrop-blur-xl',
          'shadow-2xl shadow-purple-500/10'
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Global Search</DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 border-b border-purple-500/20">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            placeholder="Search tasks, documents, habits..."
            value={query}
            onChange={(e) => dispatch(setQuery(e.target.value))}
            onKeyDown={handleKeyDown}
            className={cn(
              'border-0 bg-transparent focus-visible:ring-0',
              'placeholder:text-muted-foreground/50 py-4 text-sm'
            )}
          />
          {isSearching && (
            <Loader2 className="h-4 w-4 animate-spin text-purple-400 shrink-0" />
          )}
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-purple-500/20 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <Command className="h-3 w-3" />K
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto py-2">
          <AnimatePresence mode="wait">
            {!query.trim() ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-4 py-8 text-center text-sm text-muted-foreground"
              >
                <p>Type to search across all your data</p>
              </motion.div>
            ) : flatResults.length === 0 && !isSearching ? (
              <motion.div
                key="no-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-4 py-8 text-center text-sm text-muted-foreground"
              >
                <p>No results found for &ldquo;{query}&rdquo;</p>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {groupedResults.map((group) => {
                  const Icon = typeIcons[group.type]
                  return (
                    <div key={group.type} className="mb-2">
                      <div className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Icon className="h-3 w-3" />
                        {group.label}
                      </div>
                      {group.items.map((result) => {
                        flatIndex++
                        const currentIndex = flatIndex
                        const isSelected = currentIndex === selectedIndex
                        return (
                          <button
                            key={result.id}
                            onClick={() => handleSelect(result.url)}
                            onMouseEnter={() => setSelectedIndex(currentIndex)}
                            className={cn(
                              'w-full text-left px-4 py-2.5 flex items-start gap-3',
                              'transition-colors duration-100',
                              isSelected
                                ? 'bg-purple-500/10 text-foreground'
                                : 'text-muted-foreground hover:bg-muted/50'
                            )}
                          >
                            <Icon
                              className={cn(
                                'h-4 w-4 mt-0.5 shrink-0',
                                isSelected && 'text-purple-400'
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {result.title}
                              </p>
                              {result.snippet && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {result.snippet}
                                </p>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-purple-500/20 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-muted border border-purple-500/20 font-mono">
                &uarr;&darr;
              </kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-muted border border-purple-500/20 font-mono">
                Enter
              </kbd>
              Open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-muted border border-purple-500/20 font-mono">
                Esc
              </kbd>
              Close
            </span>
          </div>
          <span>{flatResults.length} result{flatResults.length !== 1 ? 's' : ''}</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
