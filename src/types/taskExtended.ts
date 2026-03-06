// Extended Task Types — Dependencies, Comments, Activity

export interface TaskDependency {
  id: string
  userId: string
  taskId: string
  dependsOnTaskId: string
  dependencyType: 'blocks' | 'blocked_by' | 'related'
  createdAt: string
  // Joined
  dependsOnTaskTitle?: string
  taskTitle?: string
}

export interface TaskComment {
  id: string
  userId: string
  taskId: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface TaskActivity {
  id: string
  userId: string
  taskId: string
  action: string
  details: Record<string, unknown>
  createdAt: string
}

export interface CreateTaskCommentInput {
  taskId: string
  content: string
}

export interface CreateTaskDependencyInput {
  taskId: string
  dependsOnTaskId: string
  dependencyType: 'blocks' | 'blocked_by' | 'related'
}
