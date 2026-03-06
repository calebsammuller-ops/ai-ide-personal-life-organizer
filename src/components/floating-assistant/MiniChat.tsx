'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Send, Mic, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  sendMessage,
  selectMessages,
  selectIsTyping,
  setVoiceEnabled,
} from '@/state/slices/assistantSlice'
import { useAIViewContext } from '@/providers/AIContextProvider'
import { getContextualActions, type ContextAction } from './ContextualActions'

interface MiniChatProps {
  onClose: () => void
  onVoiceMode: () => void
}

export function MiniChat({ onClose, onVoiceMode }: MiniChatProps) {
  const dispatch = useAppDispatch()
  const messages = useAppSelector(selectMessages)
  const isTyping = useAppSelector(selectIsTyping)
  const viewContext = useAIViewContext()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const contextActions = getContextualActions(viewContext.currentRoute)

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isTyping])

  // Focus input on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isTyping) return
    dispatch(sendMessage({ content: trimmed, pageContext: viewContext as unknown as Record<string, unknown> }))
    setInput('')
  }

  const handleQuickAction = (action: ContextAction) => {
    if (isTyping) return
    dispatch(sendMessage({ content: action.message, pageContext: viewContext as unknown as Record<string, unknown> }))
  }

  const handleVoice = () => {
    dispatch(setVoiceEnabled(true))
    onVoiceMode()
  }

  // Recent messages (last 6 for compact view)
  const recentMessages = messages.slice(-6)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={cn(
        'w-80 max-h-[480px] rounded-2xl overflow-hidden',
        'bg-card/95 backdrop-blur-xl border border-border/60',
        'shadow-2xl shadow-purple-500/10',
        'flex flex-col'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-medium">AI Assistant</span>
          <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">
            {viewContext.pageTitle}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full hover:bg-muted/80 flex items-center justify-center transition-colors"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0 max-h-64">
        {recentMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <p className="text-xs text-muted-foreground text-center">
              {viewContext.pageTitle !== 'Unknown'
                ? `I can see you're on ${viewContext.pageTitle}. How can I help?`
                : 'How can I help you today?'}
            </p>
          </div>
        ) : (
          recentMessages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'text-xs leading-relaxed max-w-[85%] px-3 py-2 rounded-xl',
                msg.role === 'user'
                  ? 'ml-auto bg-purple-600/90 text-white rounded-br-sm'
                  : 'mr-auto bg-muted/70 text-foreground rounded-bl-sm'
              )}
            >
              {msg.content.length > 200
                ? msg.content.substring(0, 200) + '...'
                : msg.content}
            </div>
          ))
        )}

        {isTyping && (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/70 rounded-xl rounded-bl-sm w-fit">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-purple-400"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-3 py-2 border-t border-border/30">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {contextActions.map((action) => (
            <button
              key={action.label}
              onClick={() => handleQuickAction(action)}
              disabled={isTyping}
              className={cn(
                'shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full',
                'text-[10px] font-medium',
                'bg-purple-500/10 text-purple-300 border border-purple-500/20',
                'hover:bg-purple-500/20 hover:border-purple-500/30 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <action.icon className="h-3 w-3" />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2 border border-border/30 focus-within:border-purple-500/30">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            disabled={isTyping}
          />
          <button
            onClick={handleVoice}
            className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
          >
            <Mic className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center transition-colors',
              input.trim() && !isTyping
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {isTyping ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
