'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Play, Square, User2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VOICE_OPTIONS } from '@/types/voice'
import type { VoiceId } from '@/types/voice'
import { cn } from '@/lib/utils'

interface VoiceSelectorProps {
  selectedVoice: VoiceId
  onSelectVoice: (voice: VoiceId) => void
  onPreviewVoice: (voice: VoiceId) => void
  className?: string
}

export function VoiceSelector({
  selectedVoice,
  onSelectVoice,
  onPreviewVoice,
  className,
}: VoiceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [previewingVoice, setPreviewingVoice] = useState<VoiceId | null>(null)

  const selectedOption = VOICE_OPTIONS.find((v) => v.id === selectedVoice)

  const handlePreview = (voiceId: VoiceId, e: React.MouseEvent) => {
    e.stopPropagation()
    if (previewingVoice === voiceId) {
      setPreviewingVoice(null)
      return
    }
    setPreviewingVoice(voiceId)
    onPreviewVoice(voiceId)
    // Auto-clear preview state after estimated playback
    setTimeout(() => setPreviewingVoice(null), 3000)
  }

  const handleSelect = (voiceId: VoiceId) => {
    onSelectVoice(voiceId)
    setIsOpen(false)
  }

  const genderIcon = (gender: string) => {
    if (gender === 'male') return '♂'
    if (gender === 'female') return '♀'
    return '⚪'
  }

  return (
    <div className={cn('relative', className)}>
      {/* Trigger button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2 bg-background/50 backdrop-blur-sm border-border/50 hover:bg-background/80"
      >
        <User2 className="h-3.5 w-3.5" />
        <span className="text-xs">{selectedOption?.name || 'Voice'}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </motion.div>
      </Button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full mb-2 left-0 z-50 w-72 rounded-xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden"
            >
              <div className="p-2 border-b border-border/30">
                <p className="text-xs font-medium text-muted-foreground px-2">Select Voice</p>
              </div>

              <div className="p-1.5 max-h-72 overflow-y-auto">
                {VOICE_OPTIONS.map((voice, index) => (
                  <motion.button
                    key={voice.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => handleSelect(voice.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                      'hover:bg-muted/60',
                      selectedVoice === voice.id &&
                        'bg-primary/10 border border-primary/20 shadow-sm shadow-primary/5'
                    )}
                  >
                    {/* Gender indicator */}
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0',
                        voice.gender === 'female'
                          ? 'bg-pink-500/15 text-pink-400'
                          : voice.gender === 'male'
                            ? 'bg-blue-500/15 text-blue-400'
                            : 'bg-purple-500/15 text-purple-400'
                      )}
                    >
                      {genderIcon(voice.gender)}
                    </div>

                    {/* Voice info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium">{voice.name}</span>
                        {voice.accent && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {voice.accent}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{voice.description}</p>
                    </div>

                    {/* Preview button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 flex-shrink-0 hover:bg-primary/10"
                      onClick={(e) => handlePreview(voice.id, e)}
                    >
                      {previewingVoice === voice.id ? (
                        <Square className="h-3 w-3" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                    </Button>

                    {/* Selected indicator */}
                    {selectedVoice === voice.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-2 h-2 rounded-full bg-primary flex-shrink-0"
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
