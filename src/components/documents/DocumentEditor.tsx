'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Save, Eye, Edit3, Bold, Italic, Heading, List, Code, Link2 } from 'lucide-react'

interface DocumentEditorProps {
  initialContent?: { title: string; content: string }
  onSave: (data: { title: string; content: string }) => void
  isNew?: boolean
}

export function DocumentEditor({ initialContent, onSave, isNew = false }: DocumentEditorProps) {
  const [title, setTitle] = useState(initialContent?.title ?? '')
  const [content, setContent] = useState(initialContent?.content ?? '')
  const [showPreview, setShowPreview] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = useCallback(async () => {
    if (!title.trim()) return
    setIsSaving(true)
    try {
      await onSave({ title: title.trim(), content })
    } finally {
      setIsSaving(false)
    }
  }, [title, content, onSave])

  const insertMarkdown = useCallback(
    (before: string, after: string = '') => {
      const textarea = document.querySelector<HTMLTextAreaElement>('#doc-content')
      if (!textarea) return
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selected = content.slice(start, end)
      const newContent =
        content.slice(0, start) + before + selected + after + content.slice(end)
      setContent(newContent)
      // Restore focus after state update
      requestAnimationFrame(() => {
        textarea.focus()
        textarea.setSelectionRange(
          start + before.length,
          start + before.length + selected.length
        )
      })
    },
    [content]
  )

  // Simple markdown to HTML renderer
  const renderedMarkdown = useMemo(() => {
    if (!content) return '<p class="text-muted-foreground">Nothing to preview</p>'
    let html = content
      // Escape HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Headers
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
      // Bold and italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Code blocks
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-muted p-3 rounded-lg my-2 overflow-x-auto"><code>$1</code></pre>')
      // Inline code
      .replace(/`(.+?)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm">$1</code>')
      // Lists
      .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
      // Links
      .replace(
        /\[(.+?)\]\((.+?)\)/g,
        '<a href="$2" class="text-purple-400 underline hover:text-purple-300" target="_blank" rel="noopener">$1</a>'
      )
      // Line breaks
      .replace(/\n\n/g, '</p><p class="mb-2">')
      .replace(/\n/g, '<br />')

    return `<p class="mb-2">${html}</p>`
  }, [content])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Title Input */}
      <Input
        placeholder="Document title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={cn(
          'text-xl font-bold bg-transparent border-0 border-b border-purple-500/20',
          'rounded-none px-0 focus-visible:ring-0 focus-visible:border-purple-500/50',
          'placeholder:text-muted-foreground/50'
        )}
      />

      {/* Toolbar */}
      <div className="flex items-center gap-1 flex-wrap">
        <div className="flex items-center gap-0.5 border border-purple-500/20 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => insertMarkdown('**', '**')}
            className="p-1.5 rounded hover:bg-purple-500/10 transition-colors"
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('*', '*')}
            className="p-1.5 rounded hover:bg-purple-500/10 transition-colors"
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('## ')}
            className="p-1.5 rounded hover:bg-purple-500/10 transition-colors"
            title="Heading"
          >
            <Heading className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('- ')}
            className="p-1.5 rounded hover:bg-purple-500/10 transition-colors"
            title="List"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('`', '`')}
            className="p-1.5 rounded hover:bg-purple-500/10 transition-colors"
            title="Code"
          >
            <Code className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('[', '](url)')}
            className="p-1.5 rounded hover:bg-purple-500/10 transition-colors"
            title="Link"
          >
            <Link2 className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          className={cn(
            'gap-1.5',
            showPreview && 'text-purple-400 bg-purple-500/10'
          )}
        >
          {showPreview ? (
            <>
              <Edit3 className="h-3.5 w-3.5" />
              Edit
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" />
              Preview
            </>
          )}
        </Button>
      </div>

      {/* Editor / Preview */}
      {showPreview ? (
        <Card className="border-purple-500/20">
          <CardContent className="p-6 prose prose-invert max-w-none">
            <div
              dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
              className="min-h-[300px] text-sm leading-relaxed"
            />
          </CardContent>
        </Card>
      ) : (
        <Textarea
          id="doc-content"
          placeholder="Write your document using Markdown..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className={cn(
            'min-h-[400px] resize-y font-mono text-sm',
            'bg-background/50 border-purple-500/20',
            'focus:border-purple-500/50 focus:ring-purple-500/20',
            'placeholder:text-muted-foreground/40'
          )}
        />
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!title.trim() || isSaving}
          className={cn(
            'gap-2 bg-purple-600 hover:bg-purple-700',
            'shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30',
            'transition-all duration-200'
          )}
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : isNew ? 'Create Document' : 'Save Changes'}
        </Button>
      </div>
    </motion.div>
  )
}
