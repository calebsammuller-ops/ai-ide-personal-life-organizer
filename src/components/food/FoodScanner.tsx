'use client'

import { useRef, useState, useCallback } from 'react'
import { Camera, Upload, X, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FoodScannerProps {
  onCapture: (imageData: string) => void
  isProcessing?: boolean
}

export function FoodScanner({ onCapture, isProcessing }: FoodScannerProps) {
  const [mode, setMode] = useState<'select' | 'camera' | 'preview'>('select')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1280, height: 720 },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setMode('camera')
    } catch (err) {
      setCameraError('Could not access camera. Please allow camera permissions or upload a photo instead.')
      console.error('Camera error:', err)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    const imageData = canvas.toDataURL('image/jpeg', 0.8)
    setImagePreview(imageData)
    stopCamera()
    setMode('preview')
  }, [stopCamera])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const imageData = event.target?.result as string
      setImagePreview(imageData)
      setMode('preview')
    }
    reader.readAsDataURL(file)
  }, [])

  const handleRetake = useCallback(() => {
    setImagePreview(null)
    setMode('select')
  }, [])

  const handleConfirm = useCallback(() => {
    if (imagePreview) {
      onCapture(imagePreview)
    }
  }, [imagePreview, onCapture])

  // Cleanup camera on unmount
  const handleModeChange = useCallback((newMode: 'select' | 'camera' | 'preview') => {
    if (newMode !== 'camera') {
      stopCamera()
    }
    setMode(newMode)
  }, [stopCamera])

  if (mode === 'select') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-32 flex-col gap-2"
            onClick={startCamera}
          >
            <Camera className="h-8 w-8" />
            <span>Take Photo</span>
          </Button>
          <Button
            variant="outline"
            className="h-32 flex-col gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8" />
            <span>Upload Photo</span>
          </Button>
        </div>
        {cameraError && (
          <p className="text-sm text-destructive text-center">{cameraError}</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    )
  }

  if (mode === 'camera') {
    return (
      <div className="space-y-4">
        <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>
        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            onClick={() => handleModeChange('select')}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={capturePhoto}>
            <Camera className="h-4 w-4 mr-2" />
            Capture
          </Button>
        </div>
      </div>
    )
  }

  if (mode === 'preview' && imagePreview) {
    return (
      <div className="space-y-4">
        <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
          <img
            src={imagePreview}
            alt="Food preview"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            onClick={handleRetake}
            disabled={isProcessing}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Retake
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing ? 'Analyzing...' : 'Analyze Food'}
          </Button>
        </div>
      </div>
    )
  }

  return null
}
