'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  fetchProjects,
  updateProject,
  deleteProject,
  selectProjectById,
  selectProjectsLoading,
} from '@/state/slices/projectsSlice'
import {
  fetchTasks,
  selectAllTasks,
} from '@/state/slices/tasksSlice'
import {
  fetchHabits,
  selectAllHabits,
  updateHabit,
} from '@/state/slices/habitsSlice'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FadeIn } from '@/components/ui/animated'
import { CreateTaskModal } from '@/components/modals/CreateTaskModal'
import {
  ArrowLeft,
  Edit3,
  Trash2,
  FolderOpen,
  ListTodo,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  Sparkles,
  Repeat2,
  Link2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Project } from '@/types/projects'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-green-500/10 text-green-400 border-green-500/20',
  },
  archived: {
    label: 'Archived',
    className: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  },
  completed: {
    label: 'Completed',
    className: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const projectId = params.id as string

  const project = useAppSelector(selectProjectById(projectId))
  const isLoading = useAppSelector(selectProjectsLoading)
  const allTasks = useAppSelector(selectAllTasks)
  const allHabits = useAppSelector(selectAllHabits)

  const [isDeleting, setIsDeleting] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [planOfAttack, setPlanOfAttack] = useState('')
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false)
  const [showLinkHabit, setShowLinkHabit] = useState(false)

  // Fetch project data
  useEffect(() => {
    dispatch(fetchProjects())
    dispatch(fetchTasks())
    dispatch(fetchHabits())
  }, [dispatch])

  const projectTasks = allTasks.filter((t) => t.projectId === projectId)
  const completedTasks = projectTasks.filter((t) => t.status === 'completed')
  const pendingTasks = projectTasks.filter((t) => t.status !== 'completed')
  const projectHabits = allHabits.filter((h) => h.projectId === projectId)
  const unlinkableHabits = allHabits.filter((h) => h.isActive && h.projectId !== projectId)

  const handleLinkHabit = async (habitId: string) => {
    await dispatch(updateHabit({ id: habitId, updates: { projectId } }))
    setShowLinkHabit(false)
  }

  const handleUnlinkHabit = async (habitId: string) => {
    await dispatch(updateHabit({ id: habitId, updates: { projectId: undefined } }))
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project?')) return
    setIsDeleting(true)
    try {
      await dispatch(deleteProject(projectId)).unwrap()
      router.push('/projects')
    } catch {
      setIsDeleting(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    await dispatch(
      updateProject({
        id: projectId,
        updates: { status: newStatus as Project['status'] },
      })
    )
  }

  const handleGeneratePlan = async () => {
    if (!project) return
    setIsGeneratingPlan(true)
    setPlanOfAttack('')

    const taskLines = pendingTasks
      .slice(0, 10)
      .map((t, i) => {
        const deadline = t.deadline
          ? ` (due ${new Date(t.deadline as string).toLocaleDateString()})`
          : ''
        return `${i + 1}. ${t.title}${deadline} [P${t.priority}]`
      })
      .join('\n')

    const prompt = `Give me a focused, actionable plan of attack to complete the project "${project.name}".${project.description ? ` Project goal: ${project.description}.` : ''}

Pending tasks (${pendingTasks.length}):
${taskLines || '(no tasks yet — suggest how to get started)'}

Today is ${new Date().toLocaleDateString()}. Reply with numbered steps, time estimates, and which tasks to tackle first. Be direct. Max 200 words.`

    try {
      const res = await fetch('/api/live-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: prompt, responseStyle: 'concise' }),
      })
      if (!res.ok) throw new Error('Request failed')
      const json = await res.json()
      const content = json?.data?.assistantMessage?.content
      setPlanOfAttack(content || 'Could not generate plan. Try again.')
    } catch {
      setPlanOfAttack('Failed to generate plan. Please try again.')
    } finally {
      setIsGeneratingPlan(false)
    }
  }

  if (isLoading && !project) {
    return (
      <div className="container mx-auto py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        <p className="text-sm text-muted-foreground">Loading project...</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="container mx-auto py-20 flex flex-col items-center justify-center gap-4">
        <FolderOpen className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-lg font-medium">Project not found</p>
        <Button
          variant="outline"
          onClick={() => router.push('/projects')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.active

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto py-6 px-4 max-w-4xl"
    >
      {/* Back button */}
      <FadeIn>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/projects')}
          className="mb-4 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Projects
        </Button>
      </FadeIn>

      {/* Project Header */}
      <FadeIn className="mb-6">
        <Card
          className={cn(
            'border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden',
            'hover:shadow-lg hover:shadow-purple-500/5 transition-shadow'
          )}
        >
          {/* Color bar */}
          <div
            className="h-1.5 w-full"
            style={{ backgroundColor: project.color || '#8b5cf6' }}
          />

          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                  style={{ backgroundColor: `${project.color || '#8b5cf6'}15` }}
                >
                  {project.icon || '📁'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-xl font-bold truncate">
                      {project.name}
                    </h1>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', statusConfig.className)}
                    >
                      {statusConfig.label}
                    </Badge>
                  </div>
                  {project.description && (
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      {project.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-3">
                    Created{' '}
                    {new Date(project.createdAt).toLocaleDateString('default', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border/50 hover:border-purple-500/30"
                  onClick={() => {
                    // Edit functionality - could open a modal
                  }}
                >
                  <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {
            label: 'Total Tasks',
            value: projectTasks.length,
            icon: ListTodo,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
          },
          {
            label: 'Completed',
            value: completedTasks.length,
            icon: CheckCircle2,
            color: 'text-green-400',
            bg: 'bg-green-500/10',
          },
          {
            label: 'Pending',
            value: pendingTasks.length,
            icon: Clock,
            color: 'text-orange-400',
            bg: 'bg-orange-500/10',
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.08 }}
          >
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      stat.bg
                    )}
                  >
                    <stat.icon className={cn('h-5 w-5', stat.color)} />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Plan of Attack */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mb-6"
      >
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm border-purple-500/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                Plan of Attack
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGeneratePlan}
                disabled={isGeneratingPlan}
                className="border-purple-500/20 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/30"
              >
                {isGeneratingPlan ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    {planOfAttack ? 'Regenerate' : 'Generate Plan'}
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {planOfAttack ? (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {planOfAttack}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground/60 italic">
                Click &ldquo;Generate Plan&rdquo; to get an AI-powered step-by-step plan for completing this project.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Status Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-6"
      >
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Project Status
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange(key)}
                className={cn(
                  'capitalize transition-all',
                  project.status === key
                    ? config.className
                    : 'border-border/50 text-muted-foreground'
                )}
              >
                {config.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Tasks List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-purple-400" />
                Tasks
                <Badge
                  variant="outline"
                  className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/20"
                >
                  {projectTasks.length}
                </Badge>
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowTaskModal(true)}
                className="border-border/50 hover:border-purple-500/30 h-7 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Task
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {projectTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <ListTodo className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No tasks in this project yet.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowTaskModal(true)}
                  className="mt-1 border-border/50 hover:border-purple-500/30"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add First Task
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                <AnimatePresence>
                  {projectTasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: index * 0.03 }}
                      className={cn(
                        'flex items-center justify-between py-3 px-1',
                        'hover:bg-muted/30 rounded-md transition-colors -mx-1'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full flex-shrink-0',
                            task.status === 'completed'
                              ? 'bg-green-400'
                              : task.status === 'in_progress'
                                ? 'bg-blue-400'
                                : 'bg-muted-foreground/40'
                          )}
                        />
                        <span
                          className={cn(
                            'text-sm truncate',
                            task.status === 'completed' &&
                              'line-through text-muted-foreground'
                          )}
                        >
                          {task.title}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] capitalize flex-shrink-0 ml-2',
                          task.status === 'completed'
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : task.status === 'in_progress'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-muted text-muted-foreground border-border/50'
                        )}
                      >
                        {task.status?.replace(/_/g, ' ') || 'pending'}
                      </Badge>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Habits Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-6"
      >
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Repeat2 className="h-4 w-4 text-orange-400" />
                Habits
                <Badge
                  variant="outline"
                  className="text-[10px] bg-orange-500/10 text-orange-400 border-orange-500/20"
                >
                  {projectHabits.length}
                </Badge>
              </CardTitle>
              <div className="relative">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowLinkHabit(v => !v)}
                  className="border-border/50 hover:border-orange-500/30 h-7 text-xs"
                >
                  <Link2 className="h-3.5 w-3.5 mr-1" />
                  Link Habit
                </Button>
                {showLinkHabit && (
                  <div className="absolute right-0 top-8 z-50 w-56 border border-border/50 bg-card shadow-lg rounded-md overflow-hidden">
                    {unlinkableHabits.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-3">No other active habits to link.</p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto">
                        {unlinkableHabits.map(h => (
                          <button
                            key={h.id}
                            onClick={() => handleLinkHabit(h.id)}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 transition-colors flex items-center gap-2"
                          >
                            <span>{h.icon}</span>
                            <span className="truncate">{h.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {projectHabits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <Repeat2 className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No habits linked to this project.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {projectHabits.map(h => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between py-2.5 px-1 hover:bg-muted/30 rounded-md transition-colors -mx-1"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-base">{h.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm truncate">{h.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{h.frequency}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnlinkHabit(h.id)}
                      className="text-muted-foreground/40 hover:text-red-400 transition-colors ml-2 flex-shrink-0"
                      title="Unlink habit"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Add Task Modal */}
      <CreateTaskModal
        open={showTaskModal}
        onOpenChange={setShowTaskModal}
        initialProjectId={projectId}
        projectName={project.name}
      />
    </motion.div>
  )
}
