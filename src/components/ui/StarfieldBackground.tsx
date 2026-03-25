'use client'

import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  twinkleOffset: number
}

export function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    const stars: Star[] = []
    const STAR_COUNT = 80

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const init = () => {
      stars.length = 0
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.5 + 0.3,
          speed: Math.random() * 0.15 + 0.05,
          opacity: Math.random() * 0.4 + 0.1,
          twinkleOffset: Math.random() * Math.PI * 2,
        })
      }
    }

    let t = 0
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      t += 0.008

      stars.forEach(star => {
        star.y -= star.speed
        if (star.y < -2) {
          star.y = canvas.height + 2
          star.x = Math.random() * canvas.width
        }

        const twinkle = star.opacity * (0.6 + 0.4 * Math.sin(t * 1.5 + star.twinkleOffset))

        ctx.beginPath()
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 100, 30, ${twinkle})`
        ctx.fill()

        if (star.size > 1.2) {
          ctx.beginPath()
          ctx.arc(star.x, star.y, star.size * 2.5, 0, Math.PI * 2)
          const grad = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 2.5)
          grad.addColorStop(0, `rgba(255, 90, 20, ${twinkle * 0.3})`)
          grad.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = grad
          ctx.fill()
        }
      })

      animId = requestAnimationFrame(draw)
    }

    const handleResize = () => { resize(); init() }

    resize()
    init()
    draw()
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="starfield-canvas fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.75 }}
    />
  )
}
