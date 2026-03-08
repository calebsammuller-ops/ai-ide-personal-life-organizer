'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Brain, Network, Lightbulb, ArrowRight, MessageCircle } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppSelector, useAppDispatch } from '@/state/hooks'
import { setSearchOpen, selectIsSearchOpen } from '@/state/slices/uiSlice'
import { selectAllNotes } from '@/state/slices/knowledgeSlice'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface SearchResult {
  id: string
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
  const notes = useAppSelector(selectAllNotes)

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const quickActions: SearchResult[] = [
    {
      id: 'go-knowledge',
      title: 'All Ideas',
      description: 'Browse your knowledge base',
      icon: <Brain className="h-4 w-4" />,
      color: 'text-primary bg-primary/10',
      action: () => { dispatch(setSearchOpen(false)); router.push('/knowledge') },
    },
    {
      id: 'go-graph',
      title: 'Knowledge Graph',
      description: 'Visualize your idea connections',
      icon: <Network className="h-4 w-4" />,
      color: 'text-blue-500 bg-blue-500/10',
      action: () => { dispatch(setSearchOpen(false)); router.push('/knowledge/graph') },
    },
    {
      id: 'go-ideas',
      title: 'Expand Ideas',
      description: 'Let AI expand your thoughts',
      icon: <Lightbulb className="h-4 w-4" />,
      color: 'text-amber-500 bg-amber-500/10',
      action: () => { dispatch(setSearchOpen(false)); router.push('/knowledge/ideas') },
    },
    {
      id: 'go-assistant',
      title: 'Thinking Partner',
      description: 'Chat with your AI partner',
      icon: <MessageCircle className="h-4 w-4" />,
      color: 'text-purple-500 bg-purple-500/10',
      action: () => { dispatch(setSearchOpen(false)); router.push('/live-assistant') },
    },
  ]

  const getSearchResults = useCallback((): SearchResult[] => {
    if (!query.trim()) return quickActions

    const lowerQuery = query.toLowerCase()

    const noteResults: SearchResult[] = notes
      .filter(note =>
        note.title.toLowerCase().includes(lowerQuery) ||
        note.content?.toLowerCase().includes(lowerQuery) ||
        note.tags?.some(t => t.toLowerCase().includes(lowerQuery))
      )
      .slice(0, 8)
      .map(note => ({
        id: `note-${note.id}`,
        title: note.title,
        description: note.content?.slice(0, 80),
        icon: <Brain className="h-4 w-4" />,
        color: 'text-primary bg-primary/10',
        action: () => { dispatch(setSearchOpen(false)); router.push(`/knowledge?noteId=${note.id}`) },
      }))

    const matchingActions = quickActions.filter(a =>
      a.title.toLowerCase().includes(lowerQuery)
    )

    return [...noteResults, ...matchingActions].slice(0, 10)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, notes, dispatch, router])

  const results = getSearchResults()

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => (prev + 1) % results.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => (prev - 1 + results.length) % results.length)
          break
        case 'Enter':
          e.preventDefault()
          if (results[selectedIndex]) results[selectedIndex].action()
          break
        case 'Escape':
          dispatch(setSearchOpen(false))
          break
      }
    },
    [results, selectedIndex, dispatch]
  )

  useEffect(() => { setSelectedIndex(0) }, [query])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
    }
  }, [isOpen])

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
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search ideas, notes, navigate..."
            className="border-0 shadow-none focus-visible:ring-0 text-base placeholder:text-muted-foreground/60"
          />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
              {typeof window !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">K</kbd>
          </div>
        </div>

        <ScrollArea className="max-h-[400px]">
          <div className="p-2">
            {!query.trim() && (
              <p className="text-xs text-muted-foreground px-2 py-1 mb-1">Quick Navigation</p>
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
                    index === selectedIndex ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
                  )}
                >
                  <div className={cn('p-2 rounded-lg', result.color)}>
                    {result.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{result.title}</p>
                    {result.description && (
                      <p className="text-xs text-muted-foreground truncate">{result.description}</p>
                    )}
                  </div>
                  {index === selectedIndex && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>

        <div className="flex items-center gap-4 px-4 py-2 border-t text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd> Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">↵</kbd> Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> Close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
