'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  fetchDocumentById,
  updateDocument,
  deleteDocument,
  selectDocumentById,
  selectDocumentsLoading,
} from '@/state/slices/documentsSlice'
import { DocumentEditor } from '@/components/documents/DocumentEditor'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowLeft, Trash2, FileText } from 'lucide-react'
import Link from 'next/link'

export default function DocDetailPage() {
  const params = useParams()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const id = params.id as string

  const document = useAppSelector(selectDocumentById(id))
  const isLoading = useAppSelector(selectDocumentsLoading)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (id) {
      dispatch(fetchDocumentById(id))
    }
  }, [dispatch, id])

  const handleSave = async (data: { title: string; content: string }) => {
    await dispatch(
      updateDocument({
        id,
        updates: {
          title: data.title,
          content: data.content,
          plainText: data.content,
        },
      })
    )
  }

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    await dispatch(deleteDocument(id))
    router.push('/docs')
  }

  if (isLoading && !document) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <div className="space-y-4">
          <div className="h-10 w-48 rounded bg-purple-500/5 animate-pulse" />
          <div className="h-64 rounded-xl bg-purple-500/5 animate-pulse" />
        </div>
      </div>
    )
  }

  if (!document && !isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <FileText className="h-10 w-10 text-purple-500/30 mb-3" />
          <p className="text-muted-foreground text-sm">Document not found</p>
          <Link href="/docs">
            <Button variant="ghost" className="mt-4 text-purple-300">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Documents
            </Button>
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto py-6 px-4 max-w-4xl"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <Link href="/docs">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-purple-300"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className={cn(
            'transition-colors',
            confirmDelete
              ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
              : 'text-muted-foreground hover:text-red-400'
          )}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          {confirmDelete ? 'Confirm Delete' : 'Delete'}
        </Button>
      </motion.div>

      {/* Editor */}
      {document && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <DocumentEditor
            initialContent={{
              title: document.title,
              content:
                typeof document.content === 'string'
                  ? document.content
                  : document.plainText ?? '',
            }}
            onSave={handleSave}
          />
        </motion.div>
      )}
    </motion.div>
  )
}
