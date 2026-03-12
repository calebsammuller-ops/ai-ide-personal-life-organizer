'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, User, ThumbsUp, ThumbsDown, Plus, CheckCircle, XCircle, Mic, Paperclip, X as XIcon, Zap } from 'lucide-react'
import { VAULT_COMMANDS } from '@/lib/assistant/vaultCommands'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PageContainer } from '@/components/layout/PageContainer'
import { TacticalMascot } from '@/components/ui/TacticalMascot'
import { SeismicWave } from '@/components/ui/SeismicWave'
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
} from '@/state/slices/assistantSlice'
import { cn } from '@/lib/utils'
import { useRegisterPageContext } from '@/hooks/useRegisterPageContext'

function ThinkingText() {
  const [phraseIndex, setPhraseIndex] = useState(0)
  const phrases = [
    'PROCESSING...',
    'ANALYZING PATTERNS...',
    'CROSS-REFERENCING...',
    'COMPUTING...',
    'FORMULATING RESPONSE...',
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
        className="text-[10px] text-primary font-mono tracking-widest uppercase"
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

        <p className="text-[10px] text-primary/60 uppercase tracking-widest font-mono">THINKING PARTNER</p>

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
  { id: 'explore',  title: 'Explore an Idea',   steps: ['Define the idea', 'Find assumptions', 'Connect to knowledge', 'Next action'], prompt: "Let's explore an idea together. Start by telling me the idea in one sentence." },
  { id: 'strategy', title: 'Build a Strategy',  steps: ['Define opportunity', 'Assess risks', 'Identify resources', 'Create plan'], prompt: "Let's build a strategy. What opportunity or goal are you working on?" },
  { id: 'decide',   title: 'Make a Decision',   steps: ['Define decision', 'Map options', 'Weigh trade-offs', 'Commit to next step'], prompt: "Let's make a decision together. Describe the choice you're facing." },
  { id: 'research', title: 'Research a Topic',  steps: ['What I know', 'Key questions', 'Sources to explore', 'Synthesize'], prompt: "Let's research a topic systematically. What topic are you exploring?" },
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
  }, [messages, isTyping])

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
      }
    } catch {
      // silently ignore unsupported files
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [fileToBase64, extractVideoFrame])

  const handleSend = async () => {
    if (!input.trim() && !attachment) return

    const content = input.trim() || 'Describe what you see in this image.'
    const currentAttachment = attachment
    setInput('')
    setAttachment(null)

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
      handleSend()
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
      {/* AI Loading Overlay */}
      <AnimatePresence>
        {isTyping && !voiceEnabled && <AILoadingOverlay />}
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
        <Card className="flex-1 flex flex-col min-h-0 rounded-sm">
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
                  <h2 className="text-xs font-mono font-bold tracking-widest uppercase">THINKING PARTNER</h2>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-mono">KNOWLEDGE AI</p>
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
                  <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-wider">Voice</span>
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
                        <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-wider">New</span>
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </FadeIn>
          </CardHeader>

          {/* SeismicWave between header and content */}
          <div className="flex-shrink-0 border-b border-border/50">
            <SeismicWave audioLevel={voiceEnabled ? liveAudioLevel : 0} height={44} className="opacity-75" />
          </div>

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
                  <span className="flex-1 font-mono">{error}</span>
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
                    "mx-3 mt-3 p-2.5 flex items-center gap-2 text-xs border font-mono",
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
                    <div className="px-3 py-1.5 bg-black/80 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                      Generated by DALL-E 3 · right-click to save
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Session Progress Bar */}
            {activeSession && (
              <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 border-b border-border/30 bg-card/30">
                <span className="text-[9px] font-mono text-primary/60 uppercase tracking-widest shrink-0">{activeSession.title}</span>
                <div className="flex items-center gap-1 flex-1">
                  {activeSession.steps.map((_, i) => (
                    <div key={i} className={cn('h-1 flex-1 rounded-sm transition-colors', i <= currentStep ? 'bg-primary/70' : 'bg-border/50')} />
                  ))}
                </div>
                <span className="text-[9px] font-mono text-muted-foreground/40 shrink-0">{activeSession.steps[currentStep]}</span>
                <button onClick={() => { setActiveSession(null); setCurrentStep(0) }} className="ml-1 shrink-0">
                  <XIcon className="h-3 w-3 text-muted-foreground/30 hover:text-muted-foreground transition-colors" />
                </button>
              </div>
            )}

            <ScrollArea className="flex-1 p-3" ref={scrollRef}>
              {messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center h-full text-center py-8"
                >
                  <TacticalMascot mood="greeting" size="lg" />
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-xs text-muted-foreground font-mono mb-4 max-w-xs mt-4 leading-relaxed"
                  >
                    THINKING PARTNER ONLINE. Ask me anything about your ideas, get your strategy, simulate scenarios, or use slash commands to explore your knowledge graph.
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-wrap justify-center gap-1.5"
                  >
                    {suggestedActions.map((action, index) => (
                      <motion.div
                        key={action.action}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 + index * 0.08 }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuggestedAction(action.label)}
                          className="text-[10px] font-mono uppercase tracking-wider h-7 px-2 rounded-sm"
                        >
                          {action.label}
                        </Button>
                      </motion.div>
                    ))}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    className="w-full mt-5 px-2"
                  >
                    <p className="text-[9px] font-mono text-muted-foreground/35 uppercase tracking-widest mb-2 text-center">GUIDED SESSIONS</p>
                    <div className="grid grid-cols-2 gap-2">
                      {SESSION_TEMPLATES.map(t => (
                        <button
                          key={t.id}
                          onClick={() => startSession(t)}
                          className="text-left border border-border/50 p-2.5 hover:border-primary/40 hover:bg-primary/5 rounded-sm transition-colors"
                        >
                          <p className="text-xs font-mono font-bold">{t.title}</p>
                          <p className="text-[9px] font-mono text-muted-foreground/40 mt-0.5">{t.steps.length} steps</p>
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
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: 'spring', damping: 20 }}
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
                            'max-w-[80%] px-3 py-2',
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted border border-border/50'
                          )}
                        >
                          {message.role === 'user' && attachmentPreviewsRef.current.get(message.id) && (
                            <img
                              src={attachmentPreviewsRef.current.get(message.id)}
                              alt="Attached image"
                              className="mb-2 max-h-40 max-w-full object-cover"
                            />
                          )}
                          <p className="text-xs font-mono whitespace-pre-wrap leading-relaxed">{message.content}</p>

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
                          <div className="h-7 w-7 bg-muted border border-border/50 flex-shrink-0 flex items-center justify-center">
                            <User className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </motion.div>
                    ))}
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
                              className="text-[10px] font-mono uppercase tracking-wider h-6 px-2 rounded-sm"
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
                accept="image/*,video/*"
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
                    className="absolute bottom-full mb-1 left-3 right-3 z-50 bg-background/95 backdrop-blur-md border border-primary/20 rounded-sm shadow-lg shadow-primary/10 overflow-hidden"
                  >
                    <div className="px-2 py-1 border-b border-border/50 flex items-center gap-1.5">
                      <Zap className="h-2.5 w-2.5 text-primary" />
                      <span className="text-[9px] font-mono uppercase tracking-widest text-primary/70">Vault Commands</span>
                      <span className="text-[9px] font-mono text-muted-foreground/50 ml-auto">Tab to select · Enter to run</span>
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
                            <span className="text-[11px] font-mono text-primary font-medium">{cmd.trigger}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{cmd.name}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">{cmd.description}</p>
                        </div>
                        <span className="text-[9px] font-mono text-muted-foreground/40 ml-auto mt-0.5 shrink-0">{cmd.usage}</span>
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
                    <span className="text-[10px] text-muted-foreground font-mono max-w-[120px] truncate">{attachment.name}</span>
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
                  className="flex-1 h-8 text-xs font-mono rounded-sm bg-muted/50 border-border/50 placeholder:text-muted-foreground/40 placeholder:tracking-wider placeholder:text-[10px]"
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
                  size="sm"
                  onClick={handleSend}
                  disabled={(!input.trim() && !attachment) || isTyping}
                  className="h-8 px-3 rounded-sm"
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
