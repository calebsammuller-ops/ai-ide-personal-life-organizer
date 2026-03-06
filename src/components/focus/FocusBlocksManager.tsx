'use client'

import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  fetchFocusBlocks,
  deleteFocusBlock,
  toggleFocusBlock,
  selectAllFocusBlocks,
  selectFocusBlocksLoading,
  openEditFocusBlockModal,
} from '@/state/slices/focusBlocksSlice'
import { FocusBlockCard } from './FocusBlockCard'
import { FocusBlockModal } from './FocusBlockModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Zap, Calendar } from 'lucide-react'
import type { FocusBlock } from '@/types/scheduling'

export function FocusBlocksManager() {
  const dispatch = useAppDispatch()
  const focusBlocks = useAppSelector(selectAllFocusBlocks)
  const isLoading = useAppSelector(selectFocusBlocksLoading)
  const [showModal, setShowModal] = useState(false)
  const [editingBlock, setEditingBlock] = useState<FocusBlock | null>(null)

  useEffect(() => {
    dispatch(fetchFocusBlocks())
  }, [dispatch])

  const handleEdit = (focusBlock: FocusBlock) => {
    setEditingBlock(focusBlock)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this focus block?')) {
      dispatch(deleteFocusBlock(id))
    }
  }

  const handleToggle = (id: string) => {
    dispatch(toggleFocusBlock(id))
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingBlock(null)
  }

  // Calculate total weekly focus time
  const totalWeeklyMinutes = focusBlocks
    .filter(fb => fb.isActive)
    .reduce((total, fb) => {
      const [startH, startM] = fb.startTime.split(':').map(Number)
      const [endH, endM] = fb.endTime.split(':').map(Number)
      const duration = (endH * 60 + endM) - (startH * 60 + startM)
      return total + (duration * fb.daysOfWeek.length)
    }, 0)

  const weeklyHours = Math.floor(totalWeeklyMinutes / 60)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Focus Blocks
          </h2>
          <p className="text-sm text-muted-foreground">
            Protect time for deep, focused work
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Focus Block
        </Button>
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <Zap className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{weeklyHours}h</p>
                <p className="text-sm text-muted-foreground">Weekly focus time</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-medium">{focusBlocks.filter(fb => fb.isActive).length}</p>
              <p className="text-sm text-muted-foreground">Active blocks</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Weekly Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
              const dayBlocks = focusBlocks.filter(
                fb => fb.isActive && fb.daysOfWeek.includes(index)
              )
              return (
                <div key={day} className="text-center">
                  <p className="text-xs font-medium text-muted-foreground mb-1">{day}</p>
                  <div className="min-h-[60px] space-y-1">
                    {dayBlocks.map(fb => (
                      <div
                        key={fb.id}
                        className="text-xs p-1 rounded"
                        style={{ backgroundColor: `${fb.color}20`, borderLeft: `2px solid ${fb.color}` }}
                      >
                        {fb.startTime.slice(0, 5)}
                      </div>
                    ))}
                    {dayBlocks.length === 0 && (
                      <div className="text-xs text-muted-foreground">-</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Focus Block List */}
      {focusBlocks.length > 0 ? (
        <div className="space-y-3">
          {focusBlocks.map(fb => (
            <FocusBlockCard
              key={fb.id}
              focusBlock={fb}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-1">No focus blocks yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create focus blocks to protect time for deep work
            </p>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first focus block
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      <FocusBlockModal
        open={showModal}
        onOpenChange={handleCloseModal}
        editingBlock={editingBlock}
      />
    </div>
  )
}
