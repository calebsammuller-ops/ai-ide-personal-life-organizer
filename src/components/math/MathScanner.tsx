'use client'

import { useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Camera, Upload, Type, Loader2, RotateCcw, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import { solveProblem, selectMathLoading } from '@/state/slices/mathSlice'

type InputMode = 'select' | 'camera' | 'preview' | 'text'

export function MathScanner({ subject = 'Mathematics' }: { subject?: string }) {
  const dispatch = useAppDispatch()
  const isLoading = useAppSelector(selectMathLoading)

  const [mode, setMode] = useState<InputMode>('select')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [textInput, setTextInput] = useState('')
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
    } catch {
      setCameraError('Could not access camera. Please allow camera permissions or upload a photo instead.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
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

  const handleReset = useCallback(() => {
    setImagePreview(null)
    setTextInput('')
    stopCamera()
    setMode('select')
  }, [stopCamera])

  const handleSolveImage = useCallback(() => {
    if (imagePreview) {
      dispatch(solveProblem({ image: imagePreview, subject }))
    }
  }, [dispatch, imagePreview, subject])

  const handleSolveText = useCallback(() => {
    if (textInput.trim()) {
      dispatch(solveProblem({ text: textInput.trim(), subject }))
    }
  }, [dispatch, textInput, subject])

  // Select mode
  if (mode === 'select') {
    return (
      <Card className="border-purple-500/20">
        <CardContent className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground text-center mb-4">
            {['Mathematics', 'Physics', 'Chemistry'].includes(subject)
              ? 'Snap a photo of a problem or type it in'
              : subject === 'Computer Science'
              ? 'Type or paste your CS question'
              : `Type your ${subject} question or snap a photo of a textbook page`}
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 border-purple-500/20 hover:border-purple-500/40 hover:bg-purple-500/5"
              onClick={startCamera}
            >
              <Camera className="h-6 w-6 text-purple-400" />
              <span className="text-xs">Camera</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 border-purple-500/20 hover:border-purple-500/40 hover:bg-purple-500/5"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-6 w-6 text-purple-400" />
              <span className="text-xs">Upload</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 border-purple-500/20 hover:border-purple-500/40 hover:bg-purple-500/5"
              onClick={() => setMode('text')}
            >
              <Type className="h-6 w-6 text-purple-400" />
              <span className="text-xs">Type</span>
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
        </CardContent>
      </Card>
    )
  }

  // Camera mode
  if (mode === 'camera') {
    return (
      <Card className="border-purple-500/20">
        <CardContent className="p-4 space-y-4">
          <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            {/* Viewfinder overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-8 border-2 border-purple-400/40 rounded-lg" />
            </div>
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={handleReset}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={capturePhoto}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Camera className="h-4 w-4 mr-2" />
              Capture
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Preview mode
  if (mode === 'preview' && imagePreview) {
    return (
      <Card className="border-purple-500/20">
        <CardContent className="p-4 space-y-4">
          <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
            <img
              src={imagePreview}
              alt="Math problem preview"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={handleReset} disabled={isLoading}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Retake
            </Button>
            <Button
              onClick={handleSolveImage}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Solving...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Solve Problem
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Text input mode
  if (mode === 'text') {
    return (
      <Card className="border-purple-500/20">
        <CardContent className="p-4 space-y-4">
          <Textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={`Type your ${subject} question here...`}
            className="min-h-[120px] bg-background/50 border-purple-500/20 focus:border-purple-500/40"
            disabled={isLoading}
          />
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={handleReset} disabled={isLoading}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSolveText}
              disabled={isLoading || !textInput.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Solving...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Solve Problem
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
