'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAppDispatch } from '@/state/hooks'
import { createDocument } from '@/state/slices/documentsSlice'
import { DocumentEditor } from '@/components/documents/DocumentEditor'
import { cn } from '@/lib/utils'
import { FilePlus } from 'lucide-react'

export default function NewDocPage() {
  const dispatch = useAppDispatch()
  const router = useRouter()

  const handleSave = async (data: { title: string; content: string }) => {
    const result = await dispatch(
      createDocument({
        title: data.title,
        content: data.content,
        plainText: data.content,
      })
    ).unwrap()

    if (result?.id) {
      router.push(`/docs/${result.id}`)
    }
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
        className="flex items-center gap-3 mb-6"
      >
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <FilePlus className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-purple-50">New Document</h1>
          <p className="text-sm text-muted-foreground">
            Create a new document
          </p>
        </div>
      </motion.div>

      {/* Editor */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <DocumentEditor isNew onSave={handleSave} />
      </motion.div>
    </motion.div>
  )
}
