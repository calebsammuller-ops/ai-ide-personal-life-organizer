'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { VoiceId, VoiceChatState } from '@/types/voice'
import { DEFAULT_VOICE } from '@/types/voice'
import BackgroundAudio from '@/plugins/backgroundAudio'

const VOICE_STORAGE_KEY = 'voice-assistant-selected-voice'
const VOICE_SPEED_KEY = 'voice-assistant-speed'
const VOICE_MODEL_KEY = 'voice-assistant-model'

// Silence detection constants
const SILENCE_THRESHOLD = 0.05  // fraction of 1 (below this = silence)
const SILENCE_DURATION = 2000   // ms of silence before auto-stop

interface UseVoiceChatOptions {
  onTranscript?: (transcript: string) => void
  onError?: (error: string) => void
}

export function useVoiceChat(options: UseVoiceChatOptions = {}) {
  const { onTranscript, onError } = options

  const [voiceState, setVoiceState] = useState<VoiceChatState>('idle')
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [audioLevel, setAudioLevel] = useState(0)
  const [selectedVoice, setSelectedVoiceState] = useState<VoiceId>(() => {
    if (typeof window === 'undefined') return DEFAULT_VOICE
    return (localStorage.getItem(VOICE_STORAGE_KEY) as VoiceId) || DEFAULT_VOICE
  })
  const [voiceSpeed, setVoiceSpeedState] = useState(() => {
    if (typeof window === 'undefined') return 1.0
    return parseFloat(localStorage.getItem(VOICE_SPEED_KEY) || '1.0')
  })
  const [voiceModel, setVoiceModelState] = useState<'tts-1' | 'tts-1-hd'>(() => {
    if (typeof window === 'undefined') return 'tts-1'
    return (localStorage.getItem(VOICE_MODEL_KEY) as 'tts-1' | 'tts-1-hd') || 'tts-1'
  })
  const [error, setError] = useState<string | null>(null)

  // MediaRecorder / audio monitoring refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const levelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // TTS refs
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Whisper STT works wherever MediaRecorder + getUserMedia are available
  const isSupported =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia

  // ── Persist voice settings ────────────────────────────────────────────────

  const setSelectedVoice = useCallback((voice: VoiceId) => {
    setSelectedVoiceState(voice)
    if (typeof window !== 'undefined') localStorage.setItem(VOICE_STORAGE_KEY, voice)
  }, [])

  const setVoiceSpeed = useCallback((speed: number) => {
    setVoiceSpeedState(speed)
    if (typeof window !== 'undefined') localStorage.setItem(VOICE_SPEED_KEY, String(speed))
  }, [])

  const setVoiceModel = useCallback((model: 'tts-1' | 'tts-1-hd') => {
    setVoiceModelState(model)
    if (typeof window !== 'undefined') localStorage.setItem(VOICE_MODEL_KEY, model)
  }, [])

  // ── TTS helpers ───────────────────────────────────────────────────────────

  const stopAudio = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current.currentTime = 0
      audioElementRef.current = null
    }
  }, [])

  const cancelTTSFetch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  const speakWithBrowserFallback = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        setError('Voice playback unavailable')
        onError?.('Voice playback unavailable')
        setVoiceState('idle')
        return
      }
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = voiceSpeed
      utterance.onend = () => setVoiceState('idle')
      utterance.onerror = () => setVoiceState('idle')
      window.speechSynthesis.speak(utterance)
    },
    [voiceSpeed, onError]
  )

  const speak = useCallback(
    async (text: string) => {
      if (!text.trim()) return
      stopAudio()
      cancelTTSFetch()
      setVoiceState('speaking')

      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const response = await fetch('/api/voice/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice: selectedVoice, speed: voiceSpeed, model: voiceModel }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          if (response.status === 429) {
            speakWithBrowserFallback(text)
            return
          }
          throw new Error(errorData.error || 'Voice synthesis failed')
        }

        const arrayBuffer = await response.arrayBuffer()
        if (controller.signal.aborted) return

        const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' })
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioElementRef.current = audio

        audio.onended = () => {
          URL.revokeObjectURL(url)
          audioElementRef.current = null
          setVoiceState('idle')
        }
        audio.onerror = () => {
          URL.revokeObjectURL(url)
          audioElementRef.current = null
          setError('Audio playback failed')
          setVoiceState('idle')
        }

        await audio.play()
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        speakWithBrowserFallback(text)
      } finally {
        abortControllerRef.current = null
      }
    },
    [selectedVoice, voiceSpeed, voiceModel, stopAudio, cancelTTSFetch, speakWithBrowserFallback]
  )

  // ── Audio monitoring cleanup ──────────────────────────────────────────────

  const cleanupAudioMonitoring = useCallback(() => {
    if (levelIntervalRef.current) {
      clearInterval(levelIntervalRef.current)
      levelIntervalRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setAudioLevel(0)
  }, [])

  // Stop recording without sending transcript (cancel / unmount)
  const stopRecognition = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null // prevent Whisper call
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }
    cleanupAudioMonitoring()
  }, [cleanupAudioMonitoring])

  const interrupt = useCallback(() => {
    cancelTTSFetch()
    stopAudio()
    stopRecognition()
    setVoiceState('idle')
    setInterimTranscript('')
    setTranscript('')
  }, [cancelTTSFetch, stopAudio, stopRecognition])

  // ── Whisper STT ───────────────────────────────────────────────────────────

  const startListening = useCallback(async () => {
    stopAudio()
    cancelTTSFetch()
    setError(null)
    setTranscript('')
    setInterimTranscript('🎤 Recording...')

    BackgroundAudio.startSession().catch(() => {})

    // Get microphone access
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone access denied. Please enable in Settings > Privacy > Microphone.'
          : 'Could not access microphone. Please try again.'
      setError(msg)
      onError?.(msg)
      setVoiceState('idle')
      setInterimTranscript('')
      return
    }

    streamRef.current = stream

    // Set up AudioContext for level monitoring + silence detection
    const audioCtx = new AudioContext()
    audioContextRef.current = audioCtx
    const source = audioCtx.createMediaStreamSource(stream)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    let silenceMs = 0
    const chunks: Blob[] = []

    // Pick best supported MIME type (webm on Chrome/Firefox, mp4 on Safari)
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : 'audio/mp4'

    const recorder = new MediaRecorder(stream, { mimeType })
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    recorder.onstop = async () => {
      cleanupAudioMonitoring()
      setInterimTranscript('')

      if (chunks.length === 0) {
        setVoiceState('idle')
        return
      }

      const audioBlob = new Blob(chunks, { type: mimeType })
      setVoiceState('processing')
      setInterimTranscript('Transcribing...')

      try {
        const formData = new FormData()
        const ext = mimeType.includes('mp4') || mimeType.includes('m4a') ? 'm4a' : 'webm'
        formData.append('audio', audioBlob, `audio.${ext}`)

        const response = await fetch('/api/voice/transcribe', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.error || 'Transcription failed')
        }
        const { text } = await response.json()

        const trimmed = (text || '').trim()
        if (trimmed) {
          setTranscript(trimmed)
          setInterimTranscript('')
          onTranscript?.(trimmed)
        } else {
          setVoiceState('idle')
          setInterimTranscript('')
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to transcribe audio. Please try again.'
        setError(msg)
        setVoiceState('idle')
        setInterimTranscript('')
      }
    }

    recorder.start(1000) // 1-second timeslices so chunks accumulate during recording (enables silence auto-stop)
    setVoiceState('listening')

    // Audio level monitoring + automatic silence detection
    levelIntervalRef.current = setInterval(() => {
      analyser.getByteFrequencyData(dataArray)
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
      const level = Math.min(avg / 128, 1)
      setAudioLevel(level)

      if (level < SILENCE_THRESHOLD) {
        silenceMs += 200
        // Auto-stop after sustained silence only if we've captured some audio
        if (silenceMs >= SILENCE_DURATION && chunks.length > 0) {
          if (recorder.state === 'recording') recorder.stop()
        }
      } else {
        silenceMs = 0
      }
    }, 200)
  }, [stopAudio, cancelTTSFetch, cleanupAudioMonitoring, onTranscript, onError])

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      // cleanupAudioMonitoring() is called inside recorder.onstop
    }
    setInterimTranscript('')
    BackgroundAudio.stopSession().catch(() => {})
  }, [])

  // ── Voice preview ─────────────────────────────────────────────────────────

  const previewVoice = useCallback(
    async (voice: VoiceId) => {
      stopAudio()
      cancelTTSFetch()

      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const response = await fetch('/api/voice/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: "Hi there! I'm your personal assistant. How can I help you today?",
            voice,
          }),
          signal: controller.signal,
        })

        if (!response.ok) throw new Error('Preview failed')

        const arrayBuffer = await response.arrayBuffer()
        if (controller.signal.aborted) return

        const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' })
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioElementRef.current = audio
        audio.onended = () => {
          URL.revokeObjectURL(url)
          audioElementRef.current = null
        }
        await audio.play()
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
      } finally {
        abortControllerRef.current = null
      }
    },
    [stopAudio, cancelTTSFetch]
  )

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      stopRecognition()
      stopAudio()
      cancelTTSFetch()
      BackgroundAudio.stopSession().catch(() => {})
    }
  }, [stopRecognition, stopAudio, cancelTTSFetch])

  return {
    voiceState,
    transcript,
    interimTranscript,
    audioLevel,
    selectedVoice,
    voiceSpeed,
    voiceModel,
    error,
    isSupported,
    startListening,
    stopListening,
    speak,
    interrupt,
    setSelectedVoice,
    setVoiceSpeed,
    setVoiceModel,
    previewVoice,
    setVoiceState,
    clearError: () => setError(null),
  }
}
