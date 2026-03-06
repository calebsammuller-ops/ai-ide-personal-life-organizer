'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAppDispatch } from '@/state/hooks'
import { fetchDocuments, importDocument } from '@/state/slices/documentsSlice'
import { DocumentList } from '@/components/documents/DocumentList'
import { Button } from '@/components/ui/button'
import { FileText, Plus, Upload } from 'lucide-react'
import { useRegisterPageContext } from '@/hooks/useRegisterPageContext'

export default function DocsPage() {
  const dispatch = useAppDispatch()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImporting, setIsImporting] = useState(false)

  useRegisterPageContext({
    pageTitle: 'Documents',
  })

  useEffect(() => {
    dispatch(fetchDocuments())
  }, [dispatch])

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setIsImporting(true)
    for (const file of files) {
      await dispatch(importDocument(file))
    }
    setIsImporting(false)

    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [dispatch])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto py-4 px-4 max-w-5xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-5 bg-primary" />
          <h1 className="text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2">
            <FileText className="h-4 w-4" />
            DOCS
          </h1>
        </div>

        <div className="flex items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf,.docx"
            multiple
            className="hidden"
            onChange={handleImport}
          />
          <Button
            variant="ghost"
            size="sm"
            disabled={isImporting}
            onClick={() => fileInputRef.current?.click()}
            className="h-7 px-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-primary hover:bg-primary/10"
          >
            <Upload className="h-3.5 w-3.5 mr-1" />
            {isImporting ? 'IMPORTING...' : 'IMPORT'}
          </Button>

          <Link href="/docs/new">
            <Button
              size="sm"
              className="h-7 px-3 text-[10px] font-mono uppercase tracking-wider rounded-sm"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              New Doc
            </Button>
          </Link>
        </div>
      </div>

      {/* Document List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <DocumentList />
      </motion.div>
    </motion.div>
  )
}
