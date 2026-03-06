/**
 * Background Audio Plugin — TypeScript Bridge
 *
 * Keeps the iOS app's audio session alive when backgrounded during voice mode.
 * Only activates during explicit voice conversations (App Store compliant).
 *
 * Usage:
 *   await BackgroundAudio.startSession()  // Call when voice mode begins
 *   await BackgroundAudio.stopSession()   // Call when voice mode ends
 */

import { registerPlugin } from '@capacitor/core'

export interface BackgroundAudioPlugin {
  /** Start background audio session for voice mode persistence */
  startSession(): Promise<{ started: boolean }>
  /** Stop background audio session */
  stopSession(): Promise<{ stopped: boolean }>
  /** Check if the audio session is currently active */
  isActive(): Promise<{ active: boolean }>
}

const BackgroundAudio = registerPlugin<BackgroundAudioPlugin>('BackgroundAudio', {
  web: {
    // Web fallback — no-ops since background audio is iOS-only
    async startSession() { return { started: false } },
    async stopSession() { return { stopped: true } },
    async isActive() { return { active: false } },
  },
})

export default BackgroundAudio
