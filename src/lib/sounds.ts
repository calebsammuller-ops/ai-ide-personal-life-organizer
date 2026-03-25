// Web Audio API sound effects — zero dependencies, synthesized tones

function getAudioCtx(): AudioContext | null {
  try {
    return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  } catch {
    return null
  }
}

export function playCapture() {
  const c = getAudioCtx()
  if (!c) return
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.connect(g)
  g.connect(c.destination)
  osc.frequency.setValueAtTime(660, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(1100, c.currentTime + 0.08)
  g.gain.setValueAtTime(0.06, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.14)
  osc.start()
  osc.stop(c.currentTime + 0.14)
}

export function playExecute() {
  const c = getAudioCtx()
  if (!c) return
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.connect(g)
  g.connect(c.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(220, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(440, c.currentTime + 0.12)
  g.gain.setValueAtTime(0.08, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2)
  osc.start()
  osc.stop(c.currentTime + 0.2)
}

export function playLockIn() {
  const c = getAudioCtx()
  if (!c) return
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.connect(g)
  g.connect(c.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(110, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(88, c.currentTime + 0.4)
  g.gain.setValueAtTime(0.1, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5)
  osc.start()
  osc.stop(c.currentTime + 0.5)
}

export function playExpanded() {
  const c = getAudioCtx()
  if (!c) return
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.connect(g)
  g.connect(c.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(440, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(660, c.currentTime + 0.15)
  g.gain.setValueAtTime(0.05, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25)
  osc.start()
  osc.stop(c.currentTime + 0.25)
}
