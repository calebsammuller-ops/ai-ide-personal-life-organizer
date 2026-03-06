'use client'

import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import { fetchProjects, selectProjects, selectProjectsLoading } from '@/state/slices/projectsSlice'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface ProjectSelectorProps {
  value?: string
  onValueChange: (projectId: string) => void
  className?: string
  placeholder?: string
  showNone?: boolean
}

export function ProjectSelector({
  value,
  onValueChange,
  className,
  placeholder = 'Select project...',
  showNone = true,
}: ProjectSelectorProps) {
  const dispatch = useAppDispatch()
  const projects = useAppSelector(selectProjects)
  const isLoading = useAppSelector(selectProjectsLoading)

  useEffect(() => {
    if (projects.length === 0) {
      dispatch(fetchProjects())
    }
  }, [dispatch, projects.length])

  const activeProjects = projects.filter((p) => p.status === 'active')

  return (
    <Select value={value || '__none__'} onValueChange={(v) => onValueChange(v === '__none__' ? '' : v)}>
      <SelectTrigger className={cn('w-full', className)}>
        <SelectValue placeholder={isLoading ? 'Loading...' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {showNone && (
          <SelectItem value="__none__">
            <span className="text-muted-foreground">No Project</span>
          </SelectItem>
        )}
        {activeProjects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: project.color || '#8b5cf6' }}
              />
              <span className="text-sm">{project.icon || '📁'}</span>
              <span className="truncate">{project.name}</span>
            </div>
          </SelectItem>
        ))}
        {!isLoading && activeProjects.length === 0 && (
          <div className="px-2 py-3 text-sm text-muted-foreground text-center">
            No projects yet
          </div>
        )}
      </SelectContent>
    </Select>
  )
}
