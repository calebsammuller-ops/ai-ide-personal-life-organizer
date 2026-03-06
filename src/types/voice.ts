// Voice-to-voice assistant types

export type VoiceId = 'alloy' | 'echo' | 'fable' | 'nova' | 'onyx' | 'shimmer'

export type VoiceChatState = 'idle' | 'listening' | 'processing' | 'speaking'

export interface VoiceOption {
  id: VoiceId
  name: string
  description: string
  gender: 'male' | 'female' | 'neutral'
  accent?: string
}

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: 'nova',
    name: 'Nova',
    description: 'Friendly and energetic',
    gender: 'female',
  },
  {
    id: 'alloy',
    name: 'Alloy',
    description: 'Neutral and balanced',
    gender: 'neutral',
  },
  {
    id: 'echo',
    name: 'Echo',
    description: 'Warm and conversational',
    gender: 'male',
  },
  {
    id: 'shimmer',
    name: 'Shimmer',
    description: 'Clear and gentle',
    gender: 'female',
  },
  {
    id: 'onyx',
    name: 'Onyx',
    description: 'Deep and authoritative',
    gender: 'male',
  },
  {
    id: 'fable',
    name: 'Fable',
    description: 'Expressive and warm',
    gender: 'male',
    accent: 'British',
  },
]

export const DEFAULT_VOICE: VoiceId = 'nova'
