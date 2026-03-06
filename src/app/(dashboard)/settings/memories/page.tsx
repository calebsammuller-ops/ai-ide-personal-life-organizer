'use client'

import { useState, useEffect } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Brain,
  Trash2,
  Plus,
  Loader2,
  User,
  Heart,
  Target,
  Briefcase,
  Clock,
  Activity,
  Settings2,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserMemory } from '@/types'

const categoryConfig = {
  personal: { icon: User, label: 'Personal', color: 'bg-blue-100 text-blue-800' },
  preference: { icon: Heart, label: 'Preferences', color: 'bg-pink-100 text-pink-800' },
  routine: { icon: Clock, label: 'Routines', color: 'bg-purple-100 text-purple-800' },
  goal: { icon: Target, label: 'Goals', color: 'bg-green-100 text-green-800' },
  lifestyle: { icon: Activity, label: 'Lifestyle', color: 'bg-orange-100 text-orange-800' },
  health: { icon: Heart, label: 'Health', color: 'bg-red-100 text-red-800' },
  work: { icon: Briefcase, label: 'Work', color: 'bg-indigo-100 text-indigo-800' },
}

type Category = keyof typeof categoryConfig

export default function MemoriesPage() {
  const [memories, setMemories] = useState<UserMemory[]>([])
  const [grouped, setGrouped] = useState<Record<string, UserMemory[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState<UserMemory | null>(null)
  const [newMemoryContent, setNewMemoryContent] = useState('')
  const [newMemoryCategory, setNewMemoryCategory] = useState<Category>('personal')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchMemories()
  }, [])

  const fetchMemories = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/personal-learning/memories')
      if (response.ok) {
        const result = await response.json()
        setMemories(result.data.memories)
        setGrouped(result.data.grouped)
      }
    } catch (error) {
      console.error('Failed to fetch memories:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddMemory = async () => {
    if (!newMemoryContent.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/personal-learning/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newMemoryContent,
          category: newMemoryCategory,
        }),
      })

      if (response.ok) {
        setNewMemoryContent('')
        setShowAddDialog(false)
        fetchMemories()
      }
    } catch (error) {
      console.error('Failed to add memory:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteMemory = async (memory: UserMemory) => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/personal-learning/memories?id=${memory.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setShowDeleteDialog(null)
        fetchMemories()
      }
    } catch (error) {
      console.error('Failed to delete memory:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.5) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const filteredMemories = activeTab === 'all'
    ? memories
    : grouped[activeTab] || []

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Brain className="h-6 w-6" />
              AI Memories
            </h2>
            <p className="text-muted-foreground">
              Manage what the AI assistant remembers about you
            </p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Memory
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : memories.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No memories yet</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                The AI assistant will learn about you through conversations, or you can add memories manually.
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Memory
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Memory Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{memories.length}</p>
                    <p className="text-xs text-muted-foreground">Total Memories</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {memories.filter(m => m.source === 'explicit').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Added Manually</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {memories.filter(m => m.source === 'inferred').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Learned from Chats</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {Object.keys(grouped).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Categories</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex-wrap h-auto gap-1">
                <TabsTrigger value="all">
                  All ({memories.length})
                </TabsTrigger>
                {Object.entries(grouped).map(([category, mems]) => {
                  const config = categoryConfig[category as Category]
                  return (
                    <TabsTrigger key={category} value={category}>
                      {config?.label || category} ({mems.length})
                    </TabsTrigger>
                  )
                })}
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                <div className="space-y-3">
                  {filteredMemories.map((memory) => {
                    const config = categoryConfig[memory.category as Category]
                    const Icon = config?.icon || Brain
                    return (
                      <Card key={memory.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              'p-2 rounded-lg shrink-0',
                              config?.color || 'bg-gray-100 text-gray-800'
                            )}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{memory.content}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <Badge variant="outline" className="text-xs">
                                  {config?.label || memory.category}
                                </Badge>
                                <span className={getConfidenceColor(memory.confidence)}>
                                  {Math.round(memory.confidence * 100)}% confidence
                                </span>
                                <span>•</span>
                                <span>
                                  {memory.source === 'explicit' ? (
                                    <span className="flex items-center gap-1">
                                      <Plus className="h-3 w-3" /> Added manually
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <Sparkles className="h-3 w-3" /> Learned from chat
                                    </span>
                                  )}
                                </span>
                                <span>•</span>
                                <span>Created {formatDate(memory.createdAt)}</span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => setShowDeleteDialog(memory)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* Add Memory Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a Memory</DialogTitle>
            <DialogDescription>
              Add something you want the AI assistant to remember about you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={newMemoryCategory}
                onValueChange={(v) => setNewMemoryCategory(v as Category)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <config.icon className="h-4 w-4" />
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Memory</label>
              <Input
                placeholder="e.g., I prefer morning workouts before 7am"
                value={newMemoryContent}
                onChange={(e) => setNewMemoryContent(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Write a fact about yourself in second or third person.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMemory} disabled={isSubmitting || !newMemoryContent.trim()}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Memory
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Memory</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this memory? The AI will no longer remember this about you.
            </DialogDescription>
          </DialogHeader>
          {showDeleteDialog && (
            <div className="py-4 px-4 bg-muted rounded-lg">
              <p className="text-sm">{showDeleteDialog.content}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => showDeleteDialog && handleDeleteMemory(showDeleteDialog)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
