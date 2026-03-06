// Project Management Types

export interface Project {
  id: string
  userId: string
  name: string
  description?: string
  color: string
  icon: string
  parentProjectId?: string
  status: ProjectStatus
  sortOrder: number
  isTemplate: boolean
  templateData: Record<string, unknown>
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
  // Computed
  children?: Project[]
  taskCount?: number
}

export type ProjectStatus = 'active' | 'archived' | 'completed'

export interface CreateProjectInput {
  name: string
  description?: string
  color?: string
  icon?: string
  parentProjectId?: string
  isTemplate?: boolean
}

export interface UpdateProjectInput {
  name?: string
  description?: string
  color?: string
  icon?: string
  parentProjectId?: string
  status?: ProjectStatus
  sortOrder?: number
}
