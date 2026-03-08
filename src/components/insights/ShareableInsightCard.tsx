'use client'

import { useState } from 'react'
import { X, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ShareableInsightCardProps {
  title: string
  content: string
  tags?: string[]
  onClose: () => void
}

export function ShareableInsightCard({ title, content, tags = [], onClose }: ShareableInsightCardProps) {
  const [copied, setCopied] = useState(false)

  const tagLine = tags.filter(t => t !== 'ai-insight').map(t => `#${t}`).join(' ')
  const shareText = `💡 ${title}\n\n${content}${tagLine ? `\n\n${tagLine}` : ''}\n\n— Thinking Partner`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md mx-4">
        {/* Card preview */}
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-background to-muted p-6 mb-3 font-mono shadow-2xl">
          <p className="text-lg font-bold mb-3">💡 {title}</p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">{content}</p>
          {tagLine && (
            <p className="text-xs text-primary/70 mb-4">{tagLine}</p>
          )}
          <p className="text-xs text-muted-foreground/50">— Thinking Partner</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button className="flex-1" onClick={handleCopy}>
            {copied ? (
              <><Check className="h-4 w-4 mr-2 text-green-400" />Copied!</>
            ) : (
              <><Copy className="h-4 w-4 mr-2" />Copy Text</>
            )}
          </Button>
          <Button variant="outline" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
