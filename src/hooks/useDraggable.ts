import { useState, useRef, useCallback, useEffect } from 'react'

interface Position {
  x: number
  y: number
}

interface UseDraggableOptions {
  storageKey?: string
  defaultPosition?: Position
  edgeSnapping?: boolean
  edgePadding?: number
  elementSize?: number
}

/**
 * Hook for making an element draggable with optional edge snapping
 * and position persistence via localStorage.
 */
export function useDraggable({
  storageKey = 'floating-assistant-position',
  defaultPosition,
  edgeSnapping = true,
  edgePadding = 12,
  elementSize = 56,
}: UseDraggableOptions = {}) {
  const [position, setPosition] = useState<Position>(() => {
    if (typeof window === 'undefined') {
      return defaultPosition || { x: 0, y: 0 }
    }

    // Restore from localStorage
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Validate position is within viewport
        if (
          parsed.x >= 0 && parsed.x <= window.innerWidth - elementSize &&
          parsed.y >= 0 && parsed.y <= window.innerHeight - elementSize
        ) {
          return parsed
        }
      } catch { /* ignore */ }
    }

    // Default: bottom-right corner above bottom nav
    return defaultPosition || {
      x: window.innerWidth - elementSize - edgePadding,
      y: window.innerHeight - elementSize - 80, // Above bottom nav
    }
  })

  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<Position | null>(null)
  const posStartRef = useRef<Position>(position)
  const hasMoved = useRef(false)

  const snapToEdge = useCallback((pos: Position): Position => {
    if (!edgeSnapping || typeof window === 'undefined') return pos

    const midX = window.innerWidth / 2
    const maxX = window.innerWidth - elementSize - edgePadding
    const maxY = window.innerHeight - elementSize - edgePadding

    return {
      x: pos.x < midX ? edgePadding : maxX,
      y: Math.max(edgePadding, Math.min(pos.y, maxY)),
    }
  }, [edgeSnapping, edgePadding, elementSize])

  const handleStart = useCallback((clientX: number, clientY: number) => {
    dragStartRef.current = { x: clientX, y: clientY }
    posStartRef.current = position
    hasMoved.current = false
    setIsDragging(true)
  }, [position])

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!dragStartRef.current) return

    const dx = clientX - dragStartRef.current.x
    const dy = clientY - dragStartRef.current.y

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMoved.current = true
    }

    const maxX = window.innerWidth - elementSize
    const maxY = window.innerHeight - elementSize

    setPosition({
      x: Math.max(0, Math.min(posStartRef.current.x + dx, maxX)),
      y: Math.max(0, Math.min(posStartRef.current.y + dy, maxY)),
    })
  }, [elementSize])

  const handleEnd = useCallback(() => {
    dragStartRef.current = null
    setIsDragging(false)

    if (hasMoved.current) {
      setPosition(prev => {
        const snapped = snapToEdge(prev)
        localStorage.setItem(storageKey, JSON.stringify(snapped))
        return snapped
      })
    }
  }, [snapToEdge, storageKey])

  // Touch handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    handleStart(touch.clientX, touch.clientY)
  }, [handleStart])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    handleMove(touch.clientX, touch.clientY)
  }, [handleMove])

  const onTouchEnd = useCallback(() => {
    handleEnd()
  }, [handleEnd])

  // Mouse handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    handleStart(e.clientX, e.clientY)
  }, [handleStart])

  useEffect(() => {
    if (!isDragging) return

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY)
    const onMouseUp = () => handleEnd()

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [isDragging, handleMove, handleEnd])

  return {
    position,
    isDragging,
    hasMoved,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onMouseDown,
    },
  }
}
