'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface SeismicWaveProps {
  audioLevel?: number
  className?: string
  height?: number
  color?: string
  channels?: number
}

export function SeismicWave({
  audioLevel = 0,
  className,
  height = 80,
  color = '#FF5A1F',
  channels = 2,
}: SeismicWaveProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const timeRef = useRef<number>(0)
  const smoothedLevelRef = useRef<number>(0)
  const audioLevelRef = useRef<number>(audioLevel)

  // Keep audioLevelRef in sync without triggering re-render
  useEffect(() => {
    audioLevelRef.current = audioLevel
  }, [audioLevel])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Sync canvas size to container
    const syncSize = () => {
      canvas.width = container.offsetWidth
      canvas.height = height
    }
    syncSize()

    const resizeObserver = new ResizeObserver(syncSize)
    resizeObserver.observe(container)

    const channelConfigs = [
      { freq: 0.035, phaseSpeed: 0.012 },
      { freq: 0.028, phaseSpeed: 0.009 },
    ]
    const phases = channelConfigs.map(() => Math.random() * Math.PI * 2)

    const draw = () => {
      timeRef.current += 1

      // Smooth the audio level
      smoothedLevelRef.current += (audioLevelRef.current - smoothedLevelRef.current) * 0.12

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const channelHeight = height / channels

      for (let c = 0; c < Math.min(channels, channelConfigs.length); c++) {
        const { freq, phaseSpeed } = channelConfigs[c]
        phases[c] += phaseSpeed

        const centerY = (c + 0.5) * channelHeight
        const baseAmplitude = 5
        const liveAmplitude = Math.max(baseAmplitude, smoothedLevelRef.current * 38)

        // Draw baseline
        ctx.beginPath()
        ctx.moveTo(0, centerY)
        ctx.lineTo(canvas.width, centerY)
        ctx.strokeStyle = `rgba(255, 90, 31, 0.12)`
        ctx.lineWidth = 0.5
        ctx.stroke()

        // Draw waveform
        ctx.beginPath()
        for (let x = 0; x <= canvas.width; x += 2) {
          const noise = 0.85 + 0.15 * Math.sin(x * 0.03 + phases[c] * 2.7)
          const y = centerY + liveAmplitude * Math.sin(x * freq + phases[c]) * noise
          if (x === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.lineCap = 'round'
        ctx.stroke()

        // Channel label
        ctx.fillStyle = `rgba(255, 90, 31, 0.25)`
        ctx.font = '9px monospace'
        ctx.fillText(`CH${c + 1}`, 6, centerY - 6)
      }

      animFrameRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      resizeObserver.disconnect()
    }
  }, [height, color, channels])

  return (
    <div ref={containerRef} className={cn('w-full relative', className)} style={{ height }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full"
        style={{ height }}
      />
    </div>
  )
}
