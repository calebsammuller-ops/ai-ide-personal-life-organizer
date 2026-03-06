'use client'

import { useEffect, useState } from 'react'
import { Lightbulb, Sparkles, Archive, Tag, Calendar, CheckSquare } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { PageContainer } from '@/components/layout/PageContainer'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  selectUnprocessedThoughts,
  selectProcessedThoughts,
  selectThoughtsProcessing,
  fetchThoughts,
  createThought,
  processThoughts,
  archiveThought,
} from '@/state/slices/thoughtsSlice'
import { cn } from '@/lib/utils'
import { useRegisterPageContext } from '@/hooks/useRegisterPageContext'

const priorityColors = {
  1: 'bg-red-500',
  2: 'bg-orange-500',
  3: 'bg-yellow-500',
  4: 'bg-blue-500',
  5: 'bg-gray-500',
}

const categoryIcons: Record<string, typeof Lightbulb> = {
  idea: Lightbulb,
  task: CheckSquare,
  reminder: Calendar,
  note: Tag,
  question: Lightbulb,
  goal: Sparkles,
  reflection: Tag,
}

// Safe date formatting helper to prevent "Invalid Date" display
function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return 'Just now'
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return 'Just now'
    return date.toLocaleString()
  } catch {
    return 'Just now'
  }
}

export default function ThoughtOrganizationPage() {
  const dispatch = useAppDispatch()
  const unprocessedThoughts = useAppSelector(selectUnprocessedThoughts)
  const processedThoughts = useAppSelector(selectProcessedThoughts)
  const isProcessing = useAppSelector(selectThoughtsProcessing)
  const [newThought, setNewThought] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useRegisterPageContext({
    pageTitle: 'Thought Organization',
    visibleContent: {
      type: 'thoughts',
      unprocessedCount: unprocessedThoughts.length,
      processedCount: processedThoughts.length,
    },
  })

  useEffect(() => {
    dispatch(fetchThoughts())
  }, [dispatch])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newThought.trim()) return

    setIsSubmitting(true)
    await dispatch(createThought(newThought.trim()))
    setNewThought('')
    setIsSubmitting(false)
  }

  const handleProcess = () => {
    const ids = unprocessedThoughts.map(t => t.id)
    if (ids.length > 0) {
      dispatch(processThoughts(ids))
    }
  }

  const handleArchive = (id: string) => {
    dispatch(archiveThought(id))
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Capture Your Thoughts
            </CardTitle>
            <CardDescription>
              Write down anything on your mind. We&apos;ll help organize it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Textarea
                placeholder="What's on your mind? It could be an idea, a task, a reminder, or just a note..."
                value={newThought}
                onChange={(e) => setNewThought(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button type="submit" disabled={!newThought.trim() || isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Thought'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {unprocessedThoughts.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Unprocessed Thoughts ({unprocessedThoughts.length})</CardTitle>
                <Button onClick={handleProcess} disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Process All
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {unprocessedThoughts.map((thought) => (
                  <div
                    key={thought.id}
                    className="p-4 rounded-lg bg-accent/50 flex items-start gap-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm">{thought.rawContent}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDate(thought.createdAt)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleArchive(thought.id)}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Organized Thoughts</CardTitle>
            <CardDescription>
              Thoughts that have been processed and categorized
            </CardDescription>
          </CardHeader>
          <CardContent>
            {processedThoughts.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No processed thoughts yet"
                description="Capture some thoughts and process them to see them organized here"
              />
            ) : (
              <div className="space-y-3">
                {processedThoughts.map((thought) => {
                  const CategoryIcon = thought.category
                    ? categoryIcons[thought.category] || Tag
                    : Tag

                  return (
                    <div
                      key={thought.id}
                      className="p-4 rounded-lg border flex items-start gap-3"
                    >
                      <div className={cn(
                        'w-1 h-full min-h-[60px] rounded-full',
                        priorityColors[thought.priority as keyof typeof priorityColors]
                      )} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                          {thought.category && (
                            <Badge variant="secondary" className="text-xs">
                              {thought.category}
                            </Badge>
                          )}
                          {thought.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        <p className="text-sm">{thought.processedContent || thought.rawContent}</p>

                        {thought.extractedTasks.length > 0 && (
                          <div className="mt-3 space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Extracted Tasks:</p>
                            {thought.extractedTasks.map((task, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                <CheckSquare className="h-3 w-3" />
                                <span>{task.content}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDate(thought.createdAt)}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleArchive(thought.id)}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
