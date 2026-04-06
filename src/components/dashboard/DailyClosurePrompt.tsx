'use client'

import { useState, useEffect } from 'react'
import { useAppDispatch } from '@/state/hooks'
import { createNote } from '@/state/slices/knowledgeSlice'

export function DailyClosurePrompt() {
  const dispatch = useAppDispatch()
  const [show, setShow] = useState(false)
  const [value, setValue] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const mountedAt = Date.now()
    const timer = setTimeout(() => {
      setShow(true)
    }, 20 * 60 * 1000) // 20 minutes
    return () => clearTimeout(timer)
  }, [])

  if (!show || saved) return null

  const handleSave = () => {
    if (!value.trim()) return
    dispatch(createNote({
      title: `Session reflection — ${new Date().toLocaleDateString()}`,
      content: value,
      type: 'fleeting',
      tags: ['reflection'],
    }) as any)
    setSaved(true)
    setShow(false)
  }

  return (
    <div className="pt-2 border-t border-border/20 space-y-1.5">
      <p className="text-[10px] text-muted-foreground/40 font-medium">Before you leave</p>
      <p className="text-[10px] text-muted-foreground/60">What did you move forward today?</p>
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="type here..."
        rows={2}
        className="w-full bg-muted/10 border border-border/30 rounded-lg px-2 py-1 text-[10px] text-foreground/80 placeholder:text-muted-foreground/20 focus:outline-none focus:border-primary/30 resize-none"
      />
      <button
        onClick={handleSave}
        disabled={!value.trim()}
        className="text-[10px] text-primary/60 hover:text-primary transition-colors disabled:opacity-30"
      >
        save →
      </button>
    </div>
  )
}
