'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppSelector } from '@/state/hooks'
import { selectAllDocuments, selectDocumentsLoading } from '@/state/slices/documentsSlice'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Search, Pin, FileText, Clock } from 'lucide-react'

export function DocumentList() {
  const [searchQuery, setSearchQuery] = useState('')
  const documents = useAppSelector(selectAllDocuments)
  const isLoading = useAppSelector(selectDocumentsLoading)

  const filteredDocs = useMemo(() => {
    let docs = [...documents]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      docs = docs.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.plainText.toLowerCase().includes(q)
      )
    }

    // Pinned first, then by updatedAt descending
    docs.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

    return docs
  }, [documents, searchQuery])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`
    if (diffHours < 48) return 'Yesterday'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getSnippet = (text: string, maxLen = 120) => {
    if (!text) return 'No content'
    return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 rounded-lg bg-muted/50 animate-pulse"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search Filter */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={cn(
            'pl-10 bg-background/50 border-purple-500/20',
            'focus:border-purple-500/50 focus:ring-purple-500/20',
            'transition-all duration-200'
          )}
        />
      </div>

      {/* Document List */}
      <AnimatePresence mode="popLayout">
        {filteredDocs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-muted-foreground"
          >
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {searchQuery ? 'No documents match your search' : 'No documents yet'}
            </p>
          </motion.div>
        ) : (
          filteredDocs.map((doc, index) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: index * 0.05 }}
              layout
            >
              <Link href={`/docs/${doc.id}`}>
                <Card
                  className={cn(
                    'group cursor-pointer transition-all duration-200',
                    'hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/5',
                    'hover:translate-y-[-1px]',
                    doc.isPinned && 'border-purple-500/30 bg-purple-500/5'
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {doc.isPinned && (
                            <Pin className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                          )}
                          <h3 className="font-semibold text-sm truncate group-hover:text-purple-300 transition-colors">
                            {doc.title || 'Untitled'}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {getSnippet(doc.plainText)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(doc.updatedAt)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </div>
  )
}
