'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GitBranch, ArrowRight, ArrowLeft, X, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TaskDependency } from '@/types/taskExtended'

interface TaskDependenciesProps {
  taskId: string
  dependencies: TaskDependency[]
  onRemove: (dependencyId: string) => void
}

export function TaskDependencies({
  taskId,
  dependencies,
  onRemove,
}: TaskDependenciesProps) {
  const blockingDeps = dependencies.filter(
    (d) => d.taskId === taskId && d.dependencyType === 'blocked_by'
  )
  const blockedByDeps = dependencies.filter(
    (d) => d.taskId === taskId && d.dependencyType === 'blocks'
  )
  const relatedDeps = dependencies.filter(
    (d) => d.taskId === taskId && d.dependencyType === 'related'
  )

  if (dependencies.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="py-6">
          <div className="flex flex-col items-center justify-center text-center gap-2">
            <GitBranch className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No dependencies configured for this task.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-purple-400" />
          Dependencies
          <Badge
            variant="outline"
            className="ml-auto text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/20"
          >
            {dependencies.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Blocks (this task blocks others) */}
        {blockedByDeps.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-orange-400">
              <ArrowRight className="h-3 w-3" />
              <span>Blocks</span>
            </div>
            <AnimatePresence>
              {blockedByDeps.map((dep, index) => (
                <motion.div
                  key={dep.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'flex items-center justify-between p-2.5 rounded-lg',
                    'bg-orange-500/5 border border-orange-500/10',
                    'hover:bg-orange-500/10 transition-colors'
                  )}
                >
                  <span className="text-sm truncate flex-1 mr-2">
                    {dep.dependsOnTaskTitle || dep.dependsOnTaskId}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(dep.id)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400 flex-shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Blocked By (this task is blocked by others) */}
        {blockingDeps.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-red-400">
              <ArrowLeft className="h-3 w-3" />
              <span>Blocked By</span>
            </div>
            <AnimatePresence>
              {blockingDeps.map((dep, index) => (
                <motion.div
                  key={dep.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'flex items-center justify-between p-2.5 rounded-lg',
                    'bg-red-500/5 border border-red-500/10',
                    'hover:bg-red-500/10 transition-colors'
                  )}
                >
                  <span className="text-sm truncate flex-1 mr-2">
                    {dep.dependsOnTaskTitle || dep.dependsOnTaskId}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(dep.id)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400 flex-shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Related */}
        {relatedDeps.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-blue-400">
              <Link2 className="h-3 w-3" />
              <span>Related</span>
            </div>
            <AnimatePresence>
              {relatedDeps.map((dep, index) => (
                <motion.div
                  key={dep.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'flex items-center justify-between p-2.5 rounded-lg',
                    'bg-blue-500/5 border border-blue-500/10',
                    'hover:bg-blue-500/10 transition-colors'
                  )}
                >
                  <span className="text-sm truncate flex-1 mr-2">
                    {dep.dependsOnTaskTitle || dep.dependsOnTaskId}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(dep.id)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400 flex-shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
