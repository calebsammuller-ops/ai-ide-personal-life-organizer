'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Loader2, Paperclip, Upload, X, FileText, Image, File } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Attachment {
  id: string
  taskId: string
  fileName: string
  fileSize: number
  fileType: string
  fileUrl: string
  createdAt: string
}

interface TaskAttachmentsProps {
  taskId: string
}

const fileIcons: Record<string, typeof FileText> = {
  'image': Image,
  'text': FileText,
  'default': File,
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith('image/')) return fileIcons.image
  if (fileType.startsWith('text/')) return fileIcons.text
  return fileIcons.default
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function TaskAttachments({ taskId }: TaskAttachmentsProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchAttachments = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/tasks/${taskId}/attachments`)
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setAttachments(data.data ?? [])
    } catch (error) {
      console.error('Failed to load attachments:', error)
    } finally {
      setIsLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    fetchAttachments()
  }, [fetchAttachments])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) throw new Error('Upload failed')
      const data = await response.json()
      setAttachments((prev) => [data.data, ...prev])
    } catch (error) {
      console.error('Failed to upload:', error)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Attachments
          </span>
          {attachments.length > 0 && (
            <span className="text-xs text-muted-foreground">({attachments.length})</span>
          )}
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
            Upload
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : attachments.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3 text-center">
          No attachments yet.
        </p>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence>
            {attachments.map((attachment, index) => {
              const IconComponent = getFileIcon(attachment.fileType)
              return (
                <motion.a
                  key={attachment.id}
                  href={attachment.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ delay: index * 0.03 }}
                  className={cn(
                    'flex items-center gap-2.5 p-2 rounded-md',
                    'bg-muted/30 hover:bg-muted/50 border border-border/30',
                    'transition-colors cursor-pointer group'
                  )}
                >
                  <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{attachment.fileName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatFileSize(attachment.fileSize)}
                    </p>
                  </div>
                </motion.a>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
