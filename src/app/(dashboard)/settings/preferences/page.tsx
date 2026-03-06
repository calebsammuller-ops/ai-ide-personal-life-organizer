'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { PageContainer } from '@/components/layout/PageContainer'
import { useTheme } from '@/components/providers'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import { selectPreferences, fetchPreferences, updatePreferences } from '@/state/slices/preferencesSlice'
import { Sun, Moon, Monitor, Clock, Utensils, Calendar, Shield, Brain, Eye, RefreshCw, Unlink, Bot, Volume2, Play, Square, Mic, Target, Crown, Crosshair, GraduationCap, Sprout, Hammer, Scale, Zap, BarChart3 } from 'lucide-react'
import { useAppSelector as useConsentSelector } from '@/state/hooks'
import { selectConsents, fetchConsents, updateConsent } from '@/state/slices/consentSlice'
import { cn } from '@/lib/utils'
import { VOICE_OPTIONS, DEFAULT_VOICE } from '@/types/voice'
import type { VoiceId } from '@/types/voice'

export default function PreferencesPage() {
  const dispatch = useAppDispatch()
  const preferences = useAppSelector(selectPreferences)
  const { theme, setTheme } = useTheme()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const consents = useConsentSelector(selectConsents)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // AI Assistant settings
  const [selectedVoice, setSelectedVoice] = useState<VoiceId>(() => {
    if (typeof window === 'undefined') return DEFAULT_VOICE
    return (localStorage.getItem('voice-assistant-selected-voice') as VoiceId) || DEFAULT_VOICE
  })
  const [voiceSpeed, setVoiceSpeed] = useState(() => {
    if (typeof window === 'undefined') return 1.0
    return parseFloat(localStorage.getItem('voice-assistant-speed') || '1.0')
  })
  const [voiceModel, setVoiceModel] = useState<'tts-1' | 'tts-1-hd'>(() => {
    if (typeof window === 'undefined') return 'tts-1'
    return (localStorage.getItem('voice-assistant-model') as 'tts-1' | 'tts-1-hd') || 'tts-1'
  })
  const [aiResponseStyle, setAiResponseStyle] = useState(() => {
    if (typeof window === 'undefined') return 'balanced'
    return localStorage.getItem('ai-response-style') || 'balanced'
  })
  const [previewingVoice, setPreviewingVoice] = useState<VoiceId | null>(null)

  const handleVoiceSelect = (voice: VoiceId) => {
    setSelectedVoice(voice)
    localStorage.setItem('voice-assistant-selected-voice', voice)
  }

  const handleVoiceSpeedChange = (speed: number) => {
    setVoiceSpeed(speed)
    localStorage.setItem('voice-assistant-speed', String(speed))
  }

  const handleVoiceModelChange = (model: 'tts-1' | 'tts-1-hd') => {
    setVoiceModel(model)
    localStorage.setItem('voice-assistant-model', model)
  }

  const handleResponseStyleChange = (style: string) => {
    setAiResponseStyle(style)
    localStorage.setItem('ai-response-style', style)
  }

  const handlePreviewVoice = async (voice: VoiceId) => {
    if (previewingVoice === voice) {
      setPreviewingVoice(null)
      return
    }
    setPreviewingVoice(voice)
    try {
      const response = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: "Hi there! I'm your personal assistant.",
          voice,
          speed: voiceSpeed,
          model: voiceModel,
        }),
      })
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer()
        const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' })
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audio.onended = () => { URL.revokeObjectURL(url); setPreviewingVoice(null) }
        await audio.play()
      }
    } catch {
      // Silently fail preview
    }
    setTimeout(() => setPreviewingVoice(null), 4000)
  }

  const [wakeTime, setWakeTime] = useState(preferences?.wakeTime || '07:00')
  const [sleepTime, setSleepTime] = useState(preferences?.sleepTime || '23:00')
  const [workStartTime, setWorkStartTime] = useState(preferences?.workStartTime || '09:00')
  const [workEndTime, setWorkEndTime] = useState(preferences?.workEndTime || '17:00')
  const [pushNotifications, setPushNotifications] = useState(
    preferences?.notificationPreferences?.push ?? true
  )
  const [emailNotifications, setEmailNotifications] = useState(
    preferences?.notificationPreferences?.email ?? false
  )

  // Dietary goals state
  const [dailyCalories, setDailyCalories] = useState(2000)
  const [dailyProtein, setDailyProtein] = useState(50)
  const [dailyCarbs, setDailyCarbs] = useState(250)
  const [dailyFat, setDailyFat] = useState(65)
  const [dailyFiber, setDailyFiber] = useState(25)

  useEffect(() => {
    dispatch(fetchPreferences())
    dispatch(fetchConsents())
    // Check if Google is connected
    fetch('/api/consents').then(r => r.json()).then(data => {
      if (data.data?.google_calendar?.granted) setGoogleConnected(true)
    }).catch(() => {})
    // Check URL params for Google connection result
    const params = new URLSearchParams(window.location.search)
    if (params.get('google_connected') === 'true') {
      setGoogleConnected(true)
      setMessage({ type: 'success', text: 'Google Calendar connected successfully!' })
    }
    if (params.get('error') === 'google_auth_failed') {
      setMessage({ type: 'error', text: 'Failed to connect Google Calendar. Please try again.' })
    }
  }, [dispatch])

  useEffect(() => {
    if (preferences) {
      setWakeTime(preferences.wakeTime)
      setSleepTime(preferences.sleepTime)
      setWorkStartTime(preferences.workStartTime)
      setWorkEndTime(preferences.workEndTime)
      setPushNotifications(preferences.notificationPreferences?.push ?? true)
      setEmailNotifications(preferences.notificationPreferences?.email ?? false)
    }
  }, [preferences])

  const handleSave = async () => {
    setIsLoading(true)
    setMessage(null)

    try {
      await dispatch(updatePreferences({
        wakeTime,
        sleepTime,
        workStartTime,
        workEndTime,
        notificationPreferences: {
          push: pushNotifications,
          email: emailNotifications,
          sms: false,
        },
      }))
      setMessage({ type: 'success', text: 'Preferences saved successfully' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to save preferences' })
    }

    setIsLoading(false)
  }

  const themes = [
    { value: 'light', label: 'Light', description: 'Vibrant blue theme', icon: Sun },
    { value: 'dark', label: 'Dark', description: 'Deep purple theme', icon: Moon },
    { value: 'system', label: 'System', description: 'Follow device settings', icon: Monitor },
    { value: 'time', label: 'Auto', description: 'Light by day, dark by night', icon: Clock },
  ] as const

  return (
    <PageContainer>
      <div className="space-y-6 max-w-2xl">
        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-500/10 text-green-500'
                : 'bg-destructive/10 text-destructive'
            }`}
          >
            {message.text}
          </div>
        )}

        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">Appearance</span>
            </CardTitle>
            <CardDescription>Choose your preferred theme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {themes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={cn(
                    'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300',
                    theme === t.value
                      ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  {/* Glow effect for selected */}
                  {theme === t.value && (
                    <div className="absolute inset-0 rounded-xl bg-primary/5 animate-pulse" />
                  )}

                  <div className={cn(
                    'relative z-10 p-3 rounded-lg transition-colors',
                    theme === t.value ? 'bg-primary/20' : 'bg-muted'
                  )}>
                    <t.icon className={cn(
                      'h-6 w-6 transition-colors',
                      theme === t.value ? 'text-primary' : 'text-muted-foreground'
                    )} />
                  </div>

                  <div className="relative z-10 text-center">
                    <span className={cn(
                      'block text-sm font-semibold',
                      theme === t.value && 'text-primary'
                    )}>
                      {t.label}
                    </span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {t.description}
                    </span>
                  </div>

                  {/* Selection indicator */}
                  {theme === t.value && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>Set your typical daily schedule</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="wakeTime" className="text-sm font-medium">
                  Wake Time
                </label>
                <Input
                  id="wakeTime"
                  type="time"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="sleepTime" className="text-sm font-medium">
                  Sleep Time
                </label>
                <Input
                  id="sleepTime"
                  type="time"
                  value={sleepTime}
                  onChange={(e) => setSleepTime(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="workStartTime" className="text-sm font-medium">
                  Work Start
                </label>
                <Input
                  id="workStartTime"
                  type="time"
                  value={workStartTime}
                  onChange={(e) => setWorkStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="workEndTime" className="text-sm font-medium">
                  Work End
                </label>
                <Input
                  id="workEndTime"
                  type="time"
                  value={workEndTime}
                  onChange={(e) => setWorkEndTime(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Configure how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive notifications on your device
                </p>
              </div>
              <Checkbox
                checked={pushNotifications}
                onCheckedChange={(checked) => setPushNotifications(!!checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive daily summary emails
                </p>
              </div>
              <Checkbox
                checked={emailNotifications}
                onCheckedChange={(checked) => setEmailNotifications(!!checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5" />
              Dietary Goals
            </CardTitle>
            <CardDescription>Set your daily nutrition targets for food tracking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="dailyCalories" className="text-sm font-medium">
                  Daily Calories
                </label>
                <Input
                  id="dailyCalories"
                  type="number"
                  min={0}
                  value={dailyCalories}
                  onChange={(e) => setDailyCalories(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="dailyProtein" className="text-sm font-medium">
                  Daily Protein (g)
                </label>
                <Input
                  id="dailyProtein"
                  type="number"
                  min={0}
                  value={dailyProtein}
                  onChange={(e) => setDailyProtein(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label htmlFor="dailyCarbs" className="text-sm font-medium">
                  Carbs (g)
                </label>
                <Input
                  id="dailyCarbs"
                  type="number"
                  min={0}
                  value={dailyCarbs}
                  onChange={(e) => setDailyCarbs(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="dailyFat" className="text-sm font-medium">
                  Fat (g)
                </label>
                <Input
                  id="dailyFat"
                  type="number"
                  min={0}
                  value={dailyFat}
                  onChange={(e) => setDailyFat(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="dailyFiber" className="text-sm font-medium">
                  Fiber (g)
                </label>
                <Input
                  id="dailyFiber"
                  type="number"
                  min={0}
                  value={dailyFiber}
                  onChange={(e) => setDailyFiber(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              These goals are used when scanning food to compare against your daily targets.
            </p>
          </CardContent>
        </Card>

        {/* Connected Calendars */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <span>Connected Calendars</span>
            </CardTitle>
            <CardDescription>Import events from your existing calendars</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                </div>
                <div>
                  <p className="text-sm font-medium">Google Calendar</p>
                  <p className="text-xs text-muted-foreground">
                    {googleConnected ? 'Connected — events are synced' : 'Import your Google Calendar events'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {googleConnected ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isSyncing}
                      onClick={async () => {
                        setIsSyncing(true)
                        try {
                          const res = await fetch('/api/integrations/google/sync', { method: 'POST' })
                          const data = await res.json()
                          if (data.data) {
                            setMessage({ type: 'success', text: `Synced: ${data.data.imported} new, ${data.data.updated} updated` })
                          }
                        } catch { setMessage({ type: 'error', text: 'Sync failed' }) }
                        setIsSyncing(false)
                      }}
                    >
                      <RefreshCw className={cn('h-4 w-4 mr-1', isSyncing && 'animate-spin')} />
                      Sync
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        await fetch('/api/integrations/google/disconnect', { method: 'POST' })
                        setGoogleConnected(false)
                        setMessage({ type: 'success', text: 'Google Calendar disconnected' })
                      }}
                    >
                      <Unlink className="h-4 w-4 mr-1" />
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-blue-500 to-blue-600"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/integrations/google/authorize')
                        const data = await res.json()
                        if (data.url) window.location.href = data.url
                        else setMessage({ type: 'error', text: data.error || 'Failed to start Google auth' })
                      } catch { setMessage({ type: 'error', text: 'Failed to connect' }) }
                    }}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Assistant */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-purple-500" />
              <span>AI Assistant</span>
            </CardTitle>
            <CardDescription>Customize your AI assistant&apos;s voice and behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Voice Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Voice</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {VOICE_OPTIONS.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => handleVoiceSelect(voice.id)}
                    className={cn(
                      'relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 text-left',
                      selectedVoice === voice.id
                        ? 'border-primary bg-primary/10 shadow-md shadow-primary/10'
                        : 'border-border hover:border-primary/40 hover:bg-muted/50'
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0',
                      voice.gender === 'female' ? 'bg-pink-500/15 text-pink-400'
                        : voice.gender === 'male' ? 'bg-blue-500/15 text-blue-400'
                        : 'bg-purple-500/15 text-purple-400'
                    )}>
                      {voice.gender === 'female' ? '♀' : voice.gender === 'male' ? '♂' : '⚪'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium">{voice.name}</span>
                        {voice.accent && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {voice.accent}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{voice.description}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePreviewVoice(voice.id) }}
                      className="p-1.5 rounded-md hover:bg-primary/10 transition-colors flex-shrink-0"
                    >
                      {previewingVoice === voice.id ? (
                        <Square className="h-3 w-3" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                    </button>
                    {selectedVoice === voice.id && (
                      <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Speed */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Voice Speed</span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">{voiceSpeed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={voiceSpeed}
                onChange={(e) => handleVoiceSpeedChange(parseFloat(e.target.value))}
                className="w-full accent-primary h-2 rounded-full appearance-none bg-muted cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Slow</span>
                <span>Normal</span>
                <span>Fast</span>
              </div>
            </div>

            {/* Voice Quality */}
            <div className="space-y-3">
              <span className="text-sm font-medium">Voice Quality</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'tts-1' as const, label: 'Standard', desc: 'Faster, lower cost' },
                  { value: 'tts-1-hd' as const, label: 'HD', desc: 'Higher quality, slower' },
                ].map((m) => (
                  <button
                    key={m.value}
                    onClick={() => handleVoiceModelChange(m.value)}
                    className={cn(
                      'p-3 rounded-xl border-2 text-left transition-all',
                      voiceModel === m.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/40'
                    )}
                  >
                    <span className="text-sm font-medium">{m.label}</span>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Response Style */}
            <div className="space-y-3">
              <span className="text-sm font-medium">Response Style</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'concise', label: 'Concise', desc: 'Brief & direct' },
                  { value: 'balanced', label: 'Balanced', desc: 'Natural flow' },
                  { value: 'detailed', label: 'Detailed', desc: 'In-depth answers' },
                ].map((style) => (
                  <button
                    key={style.value}
                    onClick={() => handleResponseStyleChange(style.value)}
                    className={cn(
                      'p-3 rounded-xl border-2 text-center transition-all',
                      aiResponseStyle === style.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/40'
                    )}
                  >
                    <span className="text-sm font-medium block">{style.label}</span>
                    <p className="text-[10px] text-muted-foreground">{style.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Life Mode */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-amber-500" />
              <span>Life Mode</span>
            </CardTitle>
            <CardDescription>Adapt the AI to your current state. This affects scheduling, notifications, and tone.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'normal', label: 'Normal', desc: 'Balanced productivity', icon: '☀️' },
                { value: 'deep_work', label: 'Deep Work', desc: 'Focus mode, minimal interruptions', icon: '🧠' },
                { value: 'recovery', label: 'Recovery', desc: 'Light schedule, gentle reminders', icon: '💚' },
                { value: 'travel', label: 'Travel', desc: 'Flexible, essentials only', icon: '✈️' },
                { value: 'focus_sprint', label: 'Focus Sprint', desc: 'Intense but time-boxed', icon: '⚡' },
                { value: 'low_energy', label: 'Low Energy', desc: 'Essentials only, defer the rest', icon: '🔋' },
              ] as const).map((mode) => {
                const currentMode = localStorage.getItem('life-mode') || 'normal'
                return (
                  <button
                    key={mode.value}
                    onClick={() => {
                      localStorage.setItem('life-mode', mode.value)
                      setMessage({ type: 'success', text: `Life Mode set to ${mode.label}` })
                    }}
                    className={cn(
                      'p-3 rounded-xl border-2 text-left transition-all',
                      currentMode === mode.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/40'
                    )}
                  >
                    <span className="text-lg">{mode.icon}</span>
                    <span className="text-sm font-medium block mt-1">{mode.label}</span>
                    <p className="text-[10px] text-muted-foreground">{mode.desc}</p>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Truth Mode */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-amber-500" />
              <span>Truth Mode</span>
            </CardTitle>
            <CardDescription>Control how directly the AI communicates with you</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {([
                { value: 'observational', label: 'Observational', desc: 'Shows patterns and data. You draw conclusions.', badge: 'Gentle', badgeColor: 'bg-green-500/10 text-green-400' },
                { value: 'direct', label: 'Direct', desc: 'States what the data means plainly. No sugarcoating.', badge: 'Default', badgeColor: 'bg-blue-500/10 text-blue-400' },
                { value: 'confrontational', label: 'Confrontational', desc: 'Challenges rationalizations and avoidance directly.', badge: 'Intense', badgeColor: 'bg-red-500/10 text-red-400' },
              ] as const).map((item) => {
                const currentMode = localStorage.getItem('truth-mode') || 'direct'
                return (
                  <button
                    key={item.value}
                    onClick={() => {
                      localStorage.setItem('truth-mode', item.value)
                      setMessage({ type: 'success', text: `Truth Mode set to ${item.label}` })
                    }}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-xl border-2 text-left transition-all',
                      currentMode === item.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/40'
                    )}
                  >
                    <div>
                      <span className="text-sm font-medium block">{item.label}</span>
                      <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                    </div>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', item.badgeColor)}>
                      {item.badge}
                    </span>
                  </button>
                )
              })}
            </div>
            {localStorage.getItem('truth-mode') === 'confrontational' && (
              <p className="text-xs text-amber-400/80 mt-3 p-2 rounded-lg bg-amber-500/10">
                Confrontational mode will directly challenge your rationalizations and avoidance patterns. Designed for growth, not comfort.
              </p>
            )}
          </CardContent>
        </Card>

        {/* System Persona */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Crosshair className="h-5 w-5 text-cyan-500" />
              <span>System Persona</span>
            </CardTitle>
            <CardDescription>Choose how the AI communicates — its thinking style and tone</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'truthful', label: 'Truthful', desc: 'Pure honesty. Evidence-based.', icon: Scale, badge: 'Default', badgeColor: 'bg-blue-500/10 text-blue-400' },
                { value: 'strategic', label: 'Strategic', desc: 'Trade-offs, leverage, systems.', icon: Crosshair, badge: 'Long-term', badgeColor: 'bg-purple-500/10 text-purple-400' },
                { value: 'mentorship', label: 'Mentorship', desc: 'Teaching mode. Explains why.', icon: GraduationCap, badge: 'Learning', badgeColor: 'bg-green-500/10 text-green-400' },
                { value: 'tactical', label: 'Tactical', desc: 'Minimal words, max action.', icon: Zap, badge: 'Fast', badgeColor: 'bg-orange-500/10 text-orange-400' },
              ] as const).map((item) => {
                const currentPersona = localStorage.getItem('active-persona') || 'truthful'
                return (
                  <button
                    key={item.value}
                    onClick={() => {
                      localStorage.setItem('active-persona', item.value)
                      setMessage({ type: 'success', text: `Persona set to ${item.label}` })
                    }}
                    className={cn(
                      'relative p-3 rounded-xl border-2 text-left transition-all',
                      currentPersona === item.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/40'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                    <span className={cn('absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium', item.badgeColor)}>
                      {item.badge}
                    </span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Autonomy Level */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-500" />
              <span>AI Autonomy Level</span>
            </CardTitle>
            <CardDescription>Control how much the AI can do on its own</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {([
                { level: 1, label: 'Advisory Only', desc: 'AI suggests, you decide everything', badge: 'Safe' },
                { level: 2, label: 'Suggest + Confirm', desc: 'AI proposes, you approve', badge: 'Default' },
                { level: 3, label: 'Auto-adjust', desc: 'AI makes minor changes, logs everything', badge: 'Power' },
                { level: 4, label: 'Fully Autonomous', desc: 'AI manages proactively, all reversible', badge: 'Pro' },
              ] as const).map((item) => {
                const currentLevel = parseInt(localStorage.getItem('autonomy-level') || '2')
                return (
                  <button
                    key={item.level}
                    onClick={() => {
                      localStorage.setItem('autonomy-level', String(item.level))
                      setMessage({ type: 'success', text: `Autonomy set to Level ${item.level}: ${item.label}` })
                    }}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-xl border-2 text-left transition-all',
                      currentLevel === item.level
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/40'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                        currentLevel === item.level ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      )}>
                        {item.level}
                      </div>
                      <div>
                        <span className="text-sm font-medium block">{item.label}</span>
                        <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-medium',
                      item.badge === 'Default' ? 'bg-blue-500/10 text-blue-400' :
                      item.badge === 'Safe' ? 'bg-green-500/10 text-green-400' :
                      item.badge === 'Power' ? 'bg-orange-500/10 text-orange-400' :
                      'bg-purple-500/10 text-purple-400'
                    )}>
                      {item.badge}
                    </span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Data */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-500" />
              <span>Privacy & Data</span>
            </CardTitle>
            <CardDescription>Control how your data is used</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'ai_data_access', icon: Brain, label: 'AI Data Access', desc: 'Allow AI to read your calendar, habits, and tasks for personalized help' },
              { key: 'data_learning', icon: Eye, label: 'Pattern Learning', desc: 'Allow AI to learn from your activity patterns over time' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => dispatch(updateConsent({ consentType: item.key, granted: !consents[item.key]?.granted }))}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    consents[item.key]?.granted ? 'bg-blue-500' : 'bg-zinc-600'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      consents[item.key]?.granted ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Growth Phase (auto-detected, read-only) */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-500" />
              <span>Growth Phase</span>
            </CardTitle>
            <CardDescription>Your current maturity level, auto-detected from your activity patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {([
                { value: 'novice', label: 'Novice', desc: 'Building foundational habits', icon: Sprout, color: 'text-green-400' },
                { value: 'builder', label: 'Builder', desc: 'Systems are forming, streaks building', icon: Hammer, color: 'text-blue-400' },
                { value: 'strategist', label: 'Strategist', desc: 'Thinking in trade-offs and priorities', icon: Target, color: 'text-purple-400' },
                { value: 'architect', label: 'Architect', desc: 'Designing life systems intentionally', icon: Crown, color: 'text-amber-400' },
              ] as const).map((phase, index) => {
                const currentPhase = localStorage.getItem('growth-phase') || 'novice'
                const isActive = currentPhase === phase.value
                const phaseOrder = ['novice', 'builder', 'strategist', 'architect']
                const currentIndex = phaseOrder.indexOf(currentPhase)
                const isPast = index < currentIndex
                return (
                  <div
                    key={phase.value}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border-2 transition-all',
                      isActive
                        ? 'border-primary bg-primary/10'
                        : isPast
                        ? 'border-border bg-muted/30 opacity-60'
                        : 'border-border opacity-40'
                    )}
                  >
                    <phase.icon className={cn('h-5 w-5', isActive ? phase.color : 'text-muted-foreground')} />
                    <div className="flex-1">
                      <span className={cn('text-sm font-medium block', isActive && phase.color)}>{phase.label}</span>
                      <p className="text-[10px] text-muted-foreground">{phase.desc}</p>
                    </div>
                    {isActive && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                        Current
                      </span>
                    )}
                    {isPast && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">
                        Completed
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Your growth phase is automatically detected based on activity duration, habit consistency, and feature usage. It adjusts how the AI communicates with you.
            </p>
          </CardContent>
        </Card>

        {/* Weekly Reflection */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              <span>Weekly Reflection</span>
            </CardTitle>
            <CardDescription>Strategic review of your past week — generated automatically</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                setMessage({ type: 'success', text: 'Generating weekly reflection...' })
                try {
                  const res = await fetch('/api/weekly-reflection', { method: 'POST' })
                  const data = await res.json()
                  if (data.data) {
                    setMessage({ type: 'success', text: `Weekly reflection generated for ${data.data.weekStart} to ${data.data.weekEnd}` })
                  } else {
                    setMessage({ type: 'error', text: data.error || 'Failed to generate reflection' })
                  }
                } catch {
                  setMessage({ type: 'error', text: 'Failed to generate reflection' })
                }
              }}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Generate Weekly Reflection
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              Reviews what was planned vs what happened, surfaces contradictions, and provides system-level recommendations.
            </p>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={isLoading} className="w-full">
          {isLoading ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </PageContainer>
  )
}
