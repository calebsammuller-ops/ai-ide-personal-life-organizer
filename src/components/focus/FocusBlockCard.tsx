'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/checkbox'
import { Clock, Shield, ShieldOff, Pencil, Trash2 } from 'lucide-react'
import type { FocusBlock } from '@/types/scheduling'
import { formatFocusBlockTime, formatFocusBlockDays } from '@/lib/scheduling/focusBlockManager'
import { cn } from '@/lib/utils'

interface FocusBlockCardProps {
  focusBlock: FocusBlock
  onEdit?: (focusBlock: FocusBlock) => void
  onDelete?: (id: string) => void
  onToggle?: (id: string) => void
}

export function FocusBlockCard({
  focusBlock,
  onEdit,
  onDelete,
  onToggle,
}: FocusBlockCardProps) {
  const durationMinutes = (() => {
    const [startH, startM] = focusBlock.startTime.split(':').map(Number)
    const [endH, endM] = focusBlock.endTime.split(':').map(Number)
    return (endH * 60 + endM) - (startH * 60 + startM)
  })()

  const durationText = durationMinutes >= 60
    ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60 > 0 ? `${durationMinutes % 60}m` : ''}`
    : `${durationMinutes}m`

  return (
    <Card
      className={cn(
        'transition-opacity',
        !focusBlock.isActive && 'opacity-60'
      )}
      style={{ borderLeftColor: focusBlock.color, borderLeftWidth: 4 }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium">{focusBlock.title}</h3>
              {focusBlock.isProtected ? (
                <Shield className="h-4 w-4 text-blue-500" />
              ) : (
                <ShieldOff className="h-4 w-4 text-gray-400" />
              )}
            </div>

            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatFocusBlockTime(focusBlock)}</span>
              </div>
              <span>•</span>
              <span>{durationText}</span>
            </div>

            <div className="flex flex-wrap gap-1 mb-2">
              <Badge variant="outline" className="text-xs">
                {formatFocusBlockDays(focusBlock)}
              </Badge>
              {focusBlock.allowHighPriorityOverride && (
                <Badge variant="secondary" className="text-xs">
                  Priority override
                </Badge>
              )}
            </div>

            {focusBlock.blockedCategories.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Blocks: {focusBlock.blockedCategories.join(', ')}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit?.(focusBlock)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500 hover:text-red-600"
              onClick={() => onDelete?.(focusBlock.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <span className="text-sm text-muted-foreground">
            {focusBlock.isActive ? 'Active' : 'Inactive'}
          </span>
          <Button
            variant={focusBlock.isActive ? "default" : "outline"}
            size="sm"
            onClick={() => onToggle?.(focusBlock.id)}
          >
            {focusBlock.isActive ? 'Enabled' : 'Disabled'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
