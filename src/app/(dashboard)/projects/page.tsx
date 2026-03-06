'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  fetchProjects,
  selectProjects,
  selectProjectsLoading,
  selectProjectsError,
} from '@/state/slices/projectsSlice'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { CreateProjectModal } from '@/components/projects/CreateProjectModal'
import { Button } from '@/components/ui/button'
import { FadeIn } from '@/components/ui/animated'
import { Plus, FolderKanban, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useRegisterPageContext } from '@/hooks/useRegisterPageContext'

export default function ProjectsPage() {
  const dispatch = useAppDispatch()
  const projects = useAppSelector(selectProjects)
  const isLoading = useAppSelector(selectProjectsLoading)
  const error = useAppSelector(selectProjectsError)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useRegisterPageContext({
    pageTitle: 'Projects',
    visibleContent: {
      type: 'projects',
      projectCount: projects.length,
    },
  })

  useEffect(() => {
    dispatch(fetchProjects())
  }, [dispatch])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto py-4 px-4 max-w-6xl"
    >
      {/* Header */}
      <FadeIn className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-5 bg-primary" />
          <h1 className="text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            PROJECTS
          </h1>
        </div>

        <Button
          onClick={() => setShowCreateModal(true)}
          size="sm"
          className="h-7 px-3 text-[10px] font-mono uppercase tracking-wider rounded-sm"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Project
        </Button>
      </FadeIn>

      {/* Loading */}
      {isLoading && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">LOADING...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="border border-destructive/30 bg-destructive/10 p-4 mb-5 flex items-start gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-0.5 h-4 bg-destructive flex-shrink-0" />
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <div>
              <p className="text-xs font-mono text-destructive uppercase tracking-wider">FETCH ERROR</p>
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                Projects table may not be initialised — run migration 010_clickup_foundation.sql in Supabase
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch(fetchProjects())}
            className="h-7 px-2 text-[10px] font-mono text-muted-foreground hover:text-primary shrink-0"
          >
            <RefreshCw className="h-3 w-3 mr-1" /> RETRY
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && projects.length === 0 && !error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 gap-4"
        >
          <div className="border border-border/50 p-4">
            <FolderKanban className="h-8 w-8 text-muted-foreground/30" />
          </div>
          <div className="text-center">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">NO PROJECTS</p>
            <p className="text-[10px] font-mono text-muted-foreground/50 mt-1 uppercase tracking-wider">
              Create your first project to get started
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            size="sm"
            className="h-7 px-3 text-[10px] font-mono uppercase tracking-wider rounded-sm mt-1"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Create Project
          </Button>
        </motion.div>
      )}

      {/* Project Grid */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} />
          ))}
        </div>
      )}

      <CreateProjectModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </motion.div>
  )
}
