'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FolderOpen, ListTodo, ChevronRight } from 'lucide-react'
import type { Project } from '@/types/projects'
import { cn } from '@/lib/utils'

interface ProjectCardProps {
  project: Project
  index?: number
}

const statusConfig: Record<string, { label: string; className: string }> = {
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

export function ProjectCard({ project, index = 0 }: ProjectCardProps) {
  const router = useRouter()

  const status = statusConfig[project.status] ?? statusConfig.active

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className={cn(
          'cursor-pointer transition-all duration-200',
          'hover:shadow-lg hover:shadow-purple-500/10',
          'border-border/50 hover:border-purple-500/30',
          'bg-card/80 backdrop-blur-sm',
          project.status === 'archived' && 'opacity-60'
        )}
        onClick={() => router.push(`/projects/${project.id}`)}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full ring-2 ring-offset-2 ring-offset-background flex-shrink-0"
                style={{
                  backgroundColor: project.color || '#8b5cf6',
                  ringColor: project.color || '#8b5cf6',
                }}
              />
              <div className="flex items-center gap-2">
                <span className="text-lg">{project.icon || '📁'}</span>
                <h3 className="font-semibold text-sm truncate max-w-[180px]">
                  {project.name}
                </h3>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </div>

          {project.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
              {project.description}
            </p>
          )}

          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ListTodo className="h-3.5 w-3.5" />
              <span>
                {project.taskCount ?? 0} task{(project.taskCount ?? 0) !== 1 ? 's' : ''}
              </span>
            </div>

            <Badge
              variant="outline"
              className={cn('text-[10px] px-2 py-0.5', status.className)}
            >
              {status.label}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
