'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, User, ThumbsUp, ThumbsDown, Plus, CheckCircle, XCircle, Mic, Paperclip, X as XIcon, Zap, Brain } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { VAULT_COMMANDS } from '@/lib/assistant/vaultCommands'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PageContainer } from '@/components/layout/PageContainer'
import { TacticalMascot } from '@/components/ui/TacticalMascot'
import { FadeIn } from '@/components/ui/animated'
import { FileDownloadCard } from '@/components/assistant/FileDownloadCard'
import { VoiceMode } from '@/components/live-assistant/VoiceMode'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  selectMessages,
  selectIsTyping,
  selectCurrentConversationId,
  selectActiveActions,
  selectLastActionResult,
  selectLastExecutedIntent,
  selectAssistantError,
  sendMessage,
  provideFeedback,
  startNewConversation,
  clearLastActionResult,
  clearError,
  selectVoiceEnabled,
  setVoiceEnabled,
  fetchConversations,
  fetchMessages,
  addLocalMessage,
  addStreamedAssistantMessage,
} from '@/state/slices/assistantSlice'
import { cn } from '@/lib/utils'
import { useRegisterPageContext } from '@/hooks/useRegisterPageContext'

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="text-xs leading-relaxed mb-1.5 last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-bold text-foreground">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        h1: ({ children }) => (
          <h1 className="text-sm font-semibold text-foreground mt-2 mb-1">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xs font-semibold text-primary/80 mt-2 mb-1">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-xs font-semibold text-foreground/80 mt-1.5 mb-0.5">{children}</h3>
        ),
        ul: ({ children }) => (
          <ul className="list-none space-y-0.5 my-1 pl-2">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside space-y-0.5 my-1 pl-1 text-xs">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-xs leading-relaxed flex gap-1.5 items-start">
            <span className="text-primary/50 shrink-0 mt-0.5">—</span>
            <span>{children}</span>
          </li>
        ),
        code: ({ className, children }) => {
          const isBlock = Boolean(className)
          if (isBlock) {
            return (
              <div className="relative my-2 group">
                <pre className="bg-black/60 border border-border/40 p-3 rounded-xl overflow-x-auto">
                  <code className="text-[11px] font-mono text-green-400 leading-relaxed">{children}</code>
                </pre>
                <button
                  onClick={() => navigator.clipboard.writeText(String(children))}
                  className="absolute top-1.5 right-1.5 text-[9px] font-mono text-muted-foreground/40 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 border border-border/30 rounded-xl"
                >
                  copy
                </button>
              </div>
            )
          }
          return (
            <code className="bg-black/40 border border-border/30 px-1 py-0.5 rounded text-[11px] font-mono text-primary/90">{children}</code>
          )
        },
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-primary/40 pl-3 my-1.5 text-muted-foreground italic">{children}</blockquote>
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">{children}</a>
        ),
        hr: () => <hr className="border-border/30 my-2" />,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

function ThinkingText() {
  const [phraseIndex, setPhraseIndex] = useState(0)
  const phrases = [
    'Thinking...',
    'Looking for connections...',
    'Reading your notes...',
    'Finding patterns...',
    'Almost there...',
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % phrases.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [phrases.length])

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={phraseIndex}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        className="text-xs text-primary/70"
      >
        {phrases[phraseIndex]}
      </motion.span>
    </AnimatePresence>
  )
}

function AILoadingOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative flex flex-col items-center gap-4 px-8 py-6 border border-primary/30 bg-black/80 min-w-[260px]"
      >
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/50" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-primary/50" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-primary/50" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/50" />

        <p className="text-xs text-primary/60">Thinking Partner</p>

        <div className="w-48 h-px bg-primary/10 overflow-hidden relative">
          <motion.div
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent"
            animate={{ x: ['-100%', '400%'] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <ThinkingText />
      </motion.div>
    </motion.div>
  )
}

const SESSION_TEMPLATES = [
  { id: 'explore',  title: 'Explore an Idea',   steps: ['Define the idea', 'Find assumptions', 'Connect to knowledge', 'Next action'], prompt: "What's the idea? One sentence." },
  { id: 'strategy', title: 'Build a Strategy',  steps: ['Define opportunity', 'Assess risks', 'Identify resources', 'Create plan'], prompt: "What are you trying to achieve?" },
  { id: 'decide',   title: 'Make a Decision',   steps: ['Define decision', 'Map options', 'Weigh trade-offs', 'Commit to next step'], prompt: "What's the decision? Walk me through your options." },
  { id: 'research', title: 'Research a Topic',  steps: ['What I know', 'Key questions', 'Sources to explore', 'Synthesize'], prompt: "What do you want to understand better?" },
]

export default function LiveAssistantPage() {
  const dispatch = useAppDispatch()
  const messages = useAppSelector(selectMessages)
  const isTyping = useAppSelector(selectIsTyping)
  const suggestedActions = useAppSelector(selectActiveActions)
  const conversationId = useAppSelector(selectCurrentConversationId)
  const lastActionResult = useAppSelector(selectLastActionResult)
  const lastExecutedIntent = useAppSelector(selectLastExecutedIntent)
  const error = useAppSelector(selectAssistantError)
  const voiceEnabled = useAppSelector(selectVoiceEnabled)
  const [input, setInput] = useState('')
  const [liveAudioLevel, setLiveAudioLevel] = useState(0)
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [deepThink, setDeepThink] = useState(false)
  const [attachment, setAttachment] = useState<{
    base64: string
    mimeType: string
    name: string
    previewUrl: string
  } | null>(null)
  const [activeSession, setActiveSession] = useState<typeof SESSION_TEMPLATES[0] | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const attachmentPreviewsRef = useRef<Map<string, string>>(new Map())
  const prevIsTypingRef = useRef(false)

  useRegisterPageContext({
    pageTitle: 'Thinking Partner',
  })

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping, streamingContent])

  // Restore last conversation on mount (handles page refresh / first load)
  useEffect(() => {
    if (messages.length === 0 && !conversationId) {
      dispatch(fetchConversations()).then((action) => {
        const convos = (action.payload as { id: string; lastMessageAt: string }[] | undefined)
        if (convos && convos.length > 0) {
          dispatch(fetchMessages(convos[0].id))
        }
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (lastActionResult) {
      const timer = setTimeout(() => {
        dispatch(clearLastActionResult())
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [lastActionResult, dispatch])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError())
      }, 8000)
      return () => clearTimeout(timer)
    }
  }, [error, dispatch])

  useEffect(() => {
    if (prevIsTypingRef.current && !isTyping && activeSession) {
      setCurrentStep(prev => Math.min(prev + 1, activeSession.steps.length - 1))
    }
    prevIsTypingRef.current = isTyping
  }, [isTyping, activeSession])

  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(',')[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }, [])

  const extractVideoFrame = useCallback((file: File): Promise<{ base64: string; mimeType: string; name: string; previewUrl: string }> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      const url = URL.createObjectURL(file)
      video.src = url
      video.muted = true
      video.onloadeddata = () => {
        video.currentTime = Math.min(1, video.duration / 2)
      }
      video.onseeked = () => {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(video, 0, 0)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        const base64 = dataUrl.split(',')[1]
        URL.revokeObjectURL(url)
        resolve({ base64, mimeType: 'image/jpeg', name: file.name, previewUrl: dataUrl })
      }
      video.onerror = reject
      video.load()
    })
  }, [])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      if (file.type.startsWith('video/')) {
        const frame = await extractVideoFrame(file)
        setAttachment(frame)
      } else if (file.type.startsWith('image/')) {
        const base64 = await fileToBase64(file)
        setAttachment({
          base64,
          mimeType: file.type,
          name: file.name,
          previewUrl: URL.createObjectURL(file),
        })
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const base64 = await fileToBase64(file)
        setAttachment({
          base64,
          mimeType: 'application/pdf',
          name: file.name,
          previewUrl: '',
        })
      }
    } catch {
      // silently ignore unsupported files
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [fileToBase64, extractVideoFrame])

  const handleSend = async (directMessage?: string) => {
    if (directMessage) {
      // Direct send from action cards — bypass input state
      setIsStreaming(true)
      setStreamingContent('')
      const tempUserId = `user-${Date.now()}`
      dispatch(addLocalMessage({
        id: tempUserId,
        role: 'user',
        content: directMessage,
        createdAt: new Date().toISOString(),
        conversationId: conversationId ?? '',
        feedback: null,
      } as Parameters<typeof addLocalMessage>[0]))
      try {
        const response = await fetch('/api/live-assistant/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: directMessage, conversationId, deepThink }),
        })
        if (!response.ok || !response.body) throw new Error('Stream failed')
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let accumulated = ''
        let finalConversationId = conversationId ?? ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split('\n\n')
          buffer = parts.pop() ?? ''
          for (const part of parts) {
            if (!part.startsWith('data: ')) continue
            try {
              const json = JSON.parse(part.slice(6))
              if (json.type === 'delta') { accumulated += json.text; setStreamingContent(accumulated) }
              else if (json.type === 'done') { finalConversationId = json.conversationId }
            } catch {}
          }
        }
        dispatch(addStreamedAssistantMessage({ content: accumulated, conversationId: finalConversationId }))
      } catch (err) {
        console.error('Stream error:', err)
      } finally {
        setIsStreaming(false)
        setStreamingContent('')
      }
      return
    }

    if ((!input.trim() && !attachment) || isStreaming) return

    const content = input.trim() || 'Describe what you see in this image.'
    const currentAttachment = attachment
    setInput('')
    setAttachment(null)

    // Vault commands use the existing full-featured endpoint
    if (content.startsWith('/')) {
      const result = await dispatch(sendMessage({
        conversationId: conversationId ?? undefined,
        content,
        attachment: currentAttachment
          ? { base64: currentAttachment.base64, mimeType: currentAttachment.mimeType, name: currentAttachment.name }
          : undefined,
      }))
      if (currentAttachment && sendMessage.fulfilled.match(result)) {
        attachmentPreviewsRef.current.set(result.payload.userMessage.id, currentAttachment.previewUrl)
      }
      return
    }

    // Regular messages: use streaming endpoint
    const tempUserId = `user-${Date.now()}`
    dispatch(addLocalMessage({
      id: tempUserId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      conversationId: conversationId ?? '',
      feedback: null,
    } as Parameters<typeof addLocalMessage>[0]))

    if (currentAttachment?.previewUrl) {
      attachmentPreviewsRef.current.set(tempUserId, currentAttachment.previewUrl)
    }

    setIsStreaming(true)
    setStreamingContent('')

    try {
      const response = await fetch('/api/live-assistant/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          conversationId,
          deepThink,
          attachment: currentAttachment
            ? { base64: currentAttachment.base64, mimeType: currentAttachment.mimeType }
            : undefined,
        }),
      })

      if (!response.ok || !response.body) throw new Error('Stream failed')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''
      let finalConversationId = conversationId ?? ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          try {
            const json = JSON.parse(part.slice(6))
            if (json.type === 'delta') {
              accumulated += json.text
              setStreamingContent(accumulated)
            } else if (json.type === 'done') {
              finalConversationId = json.conversationId
            } else if (json.type === 'error') {
              throw new Error(json.message)
            }
          } catch { /* skip malformed chunks */ }
        }
      }

      dispatch(addStreamedAssistantMessage({
        content: accumulated,
        conversationId: finalConversationId,
      }))
    } catch {
      dispatch(addLocalMessage({
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
        createdAt: new Date().toISOString(),
        conversationId: conversationId ?? '',
        feedback: null,
      } as Parameters<typeof addLocalMessage>[0]))
    } finally {
      setIsStreaming(false)
      setStreamingContent('')
    }
  }

  // Slash command palette
  const filteredCommands = input.startsWith('/')
    ? VAULT_COMMANDS.filter(cmd =>
        cmd.trigger.startsWith(input.split(' ')[0].toLowerCase()) ||
        cmd.name.toLowerCase().includes(input.slice(1).toLowerCase())
      )
    : []
  const showCommandPalette = filteredCommands.length > 0 && !isTyping
  const [selectedCommandIdx, setSelectedCommandIdx] = useState(0)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showCommandPalette) {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedCommandIdx(i => Math.max(0, i - 1))
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedCommandIdx(i => Math.min(filteredCommands.length - 1, i + 1))
        return
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        const cmd = filteredCommands[selectedCommandIdx]
        if (cmd) setInput(cmd.trigger + ' ')
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(undefined)
    }
  }

  const handleSuggestedAction = (label: string) => {
    setInput(label)
  }

  const handleFeedback = (messageId: string, feedback: 'helpful' | 'not_helpful') => {
    dispatch(provideFeedback({ messageId, feedback }))
  }

  const handleNewConversation = () => {
    dispatch(startNewConversation())
    setActiveSession(null)
    setCurrentStep(0)
  }

  const startSession = (template: typeof SESSION_TEMPLATES[0]) => {
    setActiveSession(template)
    setCurrentStep(0)
    dispatch(sendMessage({
      conversationId: conversationId ?? undefined,
      content: template.prompt,
    }))
  }

  return (
    <PageContainer className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)]">
      {/* AI Loading Overlay — only on first message, in-chat typing indicator handles the rest */}
      <AnimatePresence>
        {isTyping && !voiceEnabled && messages.length <= 1 && <AILoadingOverlay />}
      </AnimatePresence>

      {/* Voice Mode Overlay */}
      <AnimatePresence>
        {voiceEnabled && (
          <VoiceMode
            onClose={() => dispatch(setVoiceEnabled(false))}
            onAudioLevel={setLiveAudioLevel}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col min-h-0"
      >
        <Card className="flex-1 flex flex-col min-h-0 rounded-xl">
          <CardHeader className="flex-shrink-0 border-b border-border/50 py-2 px-4">
            <FadeIn className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <TacticalMascot
                  mood={
                    error ? 'error' :
                    isTyping ? 'thinking' :
                    voiceEnabled ? 'listening' :
                    messages.length > 0 ? 'encouraging' :
                    'greeting'
                  }
                  size="sm"
                />
                <div>
                  <h2 className="text-sm font-semibold">Thinking Partner</h2>
                  <p className="text-[10px] text-muted-foreground/50">Knowledge AI</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dispatch(setVoiceEnabled(true))}
                  className="h-7 px-2 text-muted-foreground hover:text-primary hover:bg-primary/10 gap-1"
                  title="Voice mode"
                >
                  <Mic className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-xs">Voice</span>
                </Button>
                <AnimatePresence>
                  {messages.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleNewConversation}
                        className="h-7 px-2 text-muted-foreground hover:text-primary hover:bg-primary/10 gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline text-xs">New</span>
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </FadeIn>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col min-h-0 p-0">
            {/* Error Toast */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mx-3 mt-3 p-2.5 flex items-center gap-2 text-xs bg-red-950/50 border border-red-800/50 text-red-300"
                >
                  <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="flex-1">{error}</span>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => dispatch(clearError())}>
                    <XIcon className="h-3 w-3" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Result Toast */}
            <AnimatePresence>
              {lastActionResult && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    "mx-3 mt-3 p-2.5 flex items-center gap-2 text-xs border rounded-lg",
                    lastActionResult.success
                      ? "bg-green-950/50 text-green-300 border-green-800/50"
                      : "bg-red-950/50 text-red-300 border-red-800/50"
                  )}
                >
                  {lastActionResult.success ? (
                    <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  )}
                  <span>{lastActionResult.message}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* File Download Card */}
            <AnimatePresence>
              {!!lastActionResult?.data?.generatedFile && (
                <div className="mx-3 mt-2">
                  <FileDownloadCard
                    base64={(lastActionResult.data.generatedFile as { base64: string; filename: string; mimeType: string }).base64}
                    filename={(lastActionResult.data.generatedFile as { base64: string; filename: string; mimeType: string }).filename}
                    mimeType={(lastActionResult.data.generatedFile as { base64: string; filename: string; mimeType: string }).mimeType}
                  />
                </div>
              )}
            </AnimatePresence>

            {/* DALL-E Generated Image */}
            <AnimatePresence>
              {!!lastActionResult?.data?.generatedImageUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mx-3 mt-2"
                >
                  <div className="overflow-hidden border border-primary/20 max-w-sm">
                    <img
                      src={lastActionResult.data.generatedImageUrl as string}
                      alt="AI generated image"
                      className="w-full object-cover"
                    />
                    <div className="px-3 py-1.5 bg-black/80 text-[10px] text-muted-foreground">
                      Generated by DALL-E 3 · right-click to save
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Session Progress Bar */}
            {activeSession && (
              <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 border-b border-border/30 bg-card/30">
                <span className="text-[10px] font-medium text-primary/60 shrink-0">{activeSession.title}</span>
                <div className="flex items-center gap-1 flex-1">
                  {activeSession.steps.map((_, i) => (
                    <div key={i} className={cn('h-1 flex-1 rounded-xl transition-colors', i <= currentStep ? 'bg-primary/70' : 'bg-border/50')} />
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground/40 shrink-0">{activeSession.steps[currentStep]}</span>
                <button onClick={() => { setActiveSession(null); setCurrentStep(0) }} className="ml-1 shrink-0">
                  <XIcon className="h-3 w-3 text-muted-foreground/30 hover:text-muted-foreground transition-colors" />
                </button>
              </div>
            )}

            <ScrollArea className="flex-1 p-3 smooth-scroll" ref={scrollRef}>
              {messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="flex flex-col h-full pt-6 pb-2 px-1"
                >
                  {/* Welcome headline */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="text-center mb-5"
                  >
                    <div className="inline-flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      <p className="text-xs text-primary/50">Ready</p>
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    </div>
                    <p className="text-base text-muted-foreground/60 leading-relaxed">What are you thinking about?</p>
                  </motion.div>

                  {/* Quick-start action cards */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-2 gap-2 mb-4"
                  >
                    {[
                      { icon: '🧠', label: 'Analyze my thinking', action: 'Analyze my recent thinking patterns and tell me what you notice' },
                      { icon: '🎯', label: 'What to focus on', action: 'What should I be focusing on right now based on my knowledge base?' },
                      { icon: '💡', label: 'Capture an idea', action: 'I want to capture and expand a new idea' },
                      { icon: '⚡', label: 'Challenge me', action: 'Challenge my assumptions and push my thinking forward' },
                    ].map((item, i) => (
                      <motion.button
                        key={item.label}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.35 + i * 0.06 }}
                        onClick={() => handleSend(item.action)}
                        className="text-left border border-border/40 bg-card/60 p-3.5 rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all group hover-lift"
                      >
                        <span className="text-base mb-1.5 block">{item.icon}</span>
                        <p className="text-xs font-medium text-foreground/70 group-hover:text-foreground/90 leading-snug">{item.label}</p>
                      </motion.button>
                    ))}
                  </motion.div>

                  {/* Guided sessions */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.65 }}
                  >
                    <p className="text-[10px] font-medium text-muted-foreground/40 mb-2">Guided Sessions</p>
                    <div className="grid grid-cols-2 gap-2">
                      {SESSION_TEMPLATES.map(t => (
                        <button
                          key={t.id}
                          onClick={() => startSession(t)}
                          className="text-left border border-border/30 rounded-xl p-3 hover:border-primary/35 hover:bg-primary/[0.04] transition-colors group"
                        >
                          <p className="text-xs font-medium group-hover:text-primary/80 transition-colors">{t.title}</p>
                          <p className="text-[10px] text-muted-foreground/35 mt-0.5">{t.steps.length} steps</p>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                        className={cn(
                          'flex gap-2',
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {message.role === 'assistant' && (
                          <TacticalMascot mood="encouraging" size="sm" />
                        )}

                        <div
                          className={cn(
                            'max-w-[80%] px-3 py-2 rounded-xl',
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground rounded-br-none'
                              : 'bg-muted border border-border/50 rounded-bl-none'
                          )}
                        >
                          {message.role === 'user' && attachmentPreviewsRef.current.get(message.id) && (
                            <img
                              src={attachmentPreviewsRef.current.get(message.id)}
                              alt="Attached image"
                              className="mb-2 max-h-40 max-w-full object-cover"
                            />
                          )}
                          {message.role === 'assistant' ? (
                            <MarkdownContent content={message.content} />
                          ) : (
                            <p className="text-xs whitespace-pre-wrap leading-relaxed">{message.content}</p>
                          )}

                          {message.role === 'assistant' && (
                            <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-border/30">
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn('h-5 px-1.5', message.feedback === 'helpful' && 'text-success')}
                                onClick={() => handleFeedback(message.id, 'helpful')}
                              >
                                <ThumbsUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn('h-5 px-1.5', message.feedback === 'not_helpful' && 'text-destructive')}
                                onClick={() => handleFeedback(message.id, 'not_helpful')}
                              >
                                <ThumbsDown className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {message.role === 'user' && (
                          <div className="h-7 w-7 bg-muted border border-border/50 rounded-full flex-shrink-0 flex items-center justify-center">
                            <User className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Streaming response bubble */}
                  <AnimatePresence>
                    {isStreaming && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex gap-2 justify-start"
                      >
                        <TacticalMascot mood={deepThink ? 'thinking' : 'encouraging'} size="sm" />
                        <div className="max-w-[85%] px-3 py-2 bg-muted border border-border/50 rounded-xl rounded-bl-none">
                          {streamingContent ? (
                            <div className="streaming-cursor">
                              <MarkdownContent content={streamingContent} />
                              {deepThink && (
                                <span className="text-[10px] text-primary/40 flex items-center gap-1 mt-1">
                                  <Brain className="h-2.5 w-2.5" />deep thinking...
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-primary rounded-full typing-dot" />
                                <span className="w-1.5 h-1.5 bg-primary rounded-full typing-dot" />
                                <span className="w-1.5 h-1.5 bg-primary rounded-full typing-dot" />
                              </div>
                              <ThinkingText />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Typing indicator */}
                  <AnimatePresence>
                    {isTyping && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex gap-2 items-center"
                      >
                        <TacticalMascot mood="thinking" size="sm" />
                        <div className="flex items-center gap-2 bg-muted border border-border/50 px-3 py-2">
                          <div className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                              <motion.span
                                key={i}
                                className="w-1.5 h-1.5 bg-primary"
                                animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                              />
                            ))}
                          </div>
                          <ThinkingText />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Quick actions */}
                  <AnimatePresence>
                    {!isTyping && messages.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-wrap gap-1.5 pt-1"
                      >
                        {suggestedActions.slice(0, 4).map((action, index) => (
                          <motion.div
                            key={action.action}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.08 }}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[10px] font-mono uppercase tracking-wider h-6 px-2 rounded-xl"
                              onClick={() => handleSuggestedAction(action.label)}
                            >
                              {action.label}
                            </Button>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>

            <div className="flex-shrink-0 p-3 border-t border-border/50 space-y-2 relative">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,application/pdf,.pdf"
                className="hidden"
                onChange={handleFileSelect}
              />

              {/* Slash Command Palette */}
              <AnimatePresence>
                {showCommandPalette && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute bottom-full mb-1 left-3 right-3 z-50 bg-background/95 backdrop-blur-md border border-primary/20 rounded-xl shadow-lg shadow-primary/10 overflow-hidden"
                  >
                    <div className="px-2 py-1 border-b border-border/50 flex items-center gap-1.5">
                      <Zap className="h-2.5 w-2.5 text-primary" />
                      <span className="text-[10px] font-medium text-primary/70">Commands</span>
                      <span className="text-[10px] text-muted-foreground/50 ml-auto">Tab to select · Enter to run</span>
                    </div>
                    {filteredCommands.map((cmd, i) => (
                      <button
                        key={cmd.trigger}
                        className={cn(
                          'w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors',
                          i === selectedCommandIdx
                            ? 'bg-primary/10 border-l-2 border-primary'
                            : 'hover:bg-muted/50 border-l-2 border-transparent'
                        )}
                        onMouseEnter={() => setSelectedCommandIdx(i)}
                        onClick={() => {
                          setInput(cmd.trigger + ' ')
                        }}
                      >
                        <span className="text-base leading-none mt-0.5">{cmd.icon}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-primary font-medium">{cmd.trigger}</span>
                            <span className="text-xs text-muted-foreground">{cmd.name}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">{cmd.description}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground/40 ml-auto mt-0.5 shrink-0">{cmd.usage}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Attachment preview chip */}
              <AnimatePresence>
                {attachment && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="flex items-center gap-2 px-2 py-1 bg-primary/10 border border-primary/20 w-fit"
                  >
                    <img
                      src={attachment.previewUrl}
                      alt="Attachment preview"
                      className="h-7 w-7 object-cover"
                    />
                    <span className="text-[10px] text-muted-foreground max-w-[120px] truncate">{attachment.name}</span>
                    <button
                      onClick={() => setAttachment(null)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isTyping}
                  title="Attach image or video"
                  className="h-8 px-2 text-muted-foreground hover:text-primary hover:bg-primary/10"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                </Button>

                <Input
                  placeholder="Ask anything, or type / for commands..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isTyping}
                  className="flex-1 h-9 text-xs rounded-xl bg-muted/50 border-border/50 placeholder:text-muted-foreground/40 placeholder:text-xs"
                />

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dispatch(setVoiceEnabled(true))}
                  disabled={isTyping}
                  title="Switch to voice mode"
                  className="h-8 px-2 text-muted-foreground hover:text-primary hover:bg-primary/10"
                >
                  <Mic className="h-3.5 w-3.5" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeepThink(v => !v)}
                  disabled={isTyping || isStreaming}
                  title={deepThink ? 'Deep Think ON — using extended reasoning' : 'Deep Think OFF — click to enable'}
                  className={cn(
                    'h-8 px-2 transition-colors',
                    deepThink
                      ? 'text-primary bg-primary/15 border border-primary/40'
                      : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                  )}
                >
                  <Brain className="h-3.5 w-3.5" />
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleSend()}
                  disabled={(!input.trim() && !attachment) || isTyping || isStreaming}
                  className="h-8 px-3 rounded-xl"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </PageContainer>
  )
}
