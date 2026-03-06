'use client'

import { useEffect, useRef, useCallback } from 'react'

export function GlitchBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bandsRef = useRef<HTMLDivElement>(null)
  const rgbRef = useRef<HTMLDivElement>(null)
  const animIdRef = useRef<number>(0)
  const lastFrameRef = useRef<number>(0)

  const triggerGlitch = useCallback(() => {
    const bandsEl = bandsRef.current
    const rgbEl = rgbRef.current
    if (!bandsEl || !rgbEl) return

    const duration = Math.random() * 280 + 70
    const numBands = Math.floor(Math.random() * 5) + 1

    // Animate RGB shift
    rgbEl.style.animation = 'none'
    void rgbEl.offsetWidth // force reflow to restart animation
    rgbEl.style.animation = `glitch-rgb ${duration}ms steps(4) forwards`

    // Spawn glitch bands
    const bands: HTMLElement[] = []
    for (let i = 0; i < numBands; i++) {
      const el = document.createElement('div')
      const top = Math.random() * 85 + 5
      const height = Math.random() * 55 + 4
      const offset = Math.random() * 90 - 45
      const variant = Math.random()

      el.style.cssText = `
        position: absolute;
        left: 0;
        right: 0;
        top: ${top}%;
        height: ${height}px;
        transform: translateX(${offset}px);
        pointer-events: none;
      `

      if (variant < 0.3) {
        // Bright white band — like a signal burst
        el.style.background = 'rgba(255,255,255,0.06)'
        el.style.mixBlendMode = 'screen'
      } else if (variant < 0.55) {
        // Dark tear band
        el.style.background = 'rgba(0,0,0,0.5)'
      } else if (variant < 0.78) {
        // RGB color fringe band
        el.style.background =
          'linear-gradient(90deg, rgba(255,20,80,0.1) 0%, rgba(255,255,255,0.07) 40%, rgba(0,230,255,0.1) 100%)'
        el.style.mixBlendMode = 'screen'
      } else {
        // Subtle noise smear
        el.style.background = 'rgba(120,190,255,0.04)'
        el.style.mixBlendMode = 'screen'
        el.style.filter = 'blur(1px)'
      }

      bandsEl.appendChild(el)
      bands.push(el)
    }

    setTimeout(() => {
      bands.forEach(el => el.remove())
    }, duration)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Render static at half resolution for performance, CSS stretches it up
    const SCALE = 0.5
    const FRAME_INTERVAL = 1000 / 15 // 15 fps for the noise

    const drawStatic = (timestamp: number) => {
      animIdRef.current = requestAnimationFrame(drawStatic)
      if (timestamp - lastFrameRef.current < FRAME_INTERVAL) return
      lastFrameRef.current = timestamp

      const w = canvas.width
      const h = canvas.height
      const imageData = ctx.createImageData(w, h)
      const data = imageData.data

      for (let i = 0; i < data.length; i += 4) {
        const v = Math.random() * 140
        data[i]     = v * 0.5   // R — dimmed for cool CRT blue tint
        data[i + 1] = v * 0.72  // G
        data[i + 2] = v         // B — full blue channel
        data[i + 3] = 38        // visible alpha
      }

      ctx.putImageData(imageData, 0, 0)
    }

    const resize = () => {
      canvas.width  = Math.ceil(window.innerWidth  * SCALE)
      canvas.height = Math.ceil(window.innerHeight * SCALE)
    }

    resize()
    window.addEventListener('resize', resize)
    animIdRef.current = requestAnimationFrame(drawStatic)

    // Schedule periodic glitches
    let glitchTimeout: ReturnType<typeof setTimeout>
    const scheduleGlitch = () => {
      const delay = Math.random() * 2500 + 600
      glitchTimeout = setTimeout(() => {
        // 35% chance of a rapid burst of 3 glitches
        triggerGlitch()
        if (Math.random() < 0.35) {
          setTimeout(triggerGlitch, 110)
          setTimeout(triggerGlitch, 240)
        }
        scheduleGlitch()
      }, delay)
    }
    scheduleGlitch()

    return () => {
      cancelAnimationFrame(animIdRef.current)
      window.removeEventListener('resize', resize)
      clearTimeout(glitchTimeout)
    }
  }, [triggerGlitch])

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Blue-tinted static noise — half-res for performance */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 0.14 }}
      />

      {/* CRT horizontal scanlines */}
      <div className="absolute inset-0 glitch-scanlines" />

      {/* Corner vignette */}
      <div className="absolute inset-0 glitch-vignette" />

      {/* Rare full-screen flicker */}
      <div className="absolute inset-0 glitch-flicker" />

      {/* JS-injected glitch bands */}
      <div ref={bandsRef} className="absolute inset-0" />

      {/* RGB channel split overlay */}
      <div
        ref={rgbRef}
        className="absolute inset-0"
        style={{ mixBlendMode: 'screen' }}
      />
    </div>
  )
}
