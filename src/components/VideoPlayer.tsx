import { useRef, useEffect, useState } from 'react'
import { useAnimationFrame } from '../hooks/useAnimationFrame'

type Props = {
  width: number
  height: number
}

export function VideoPlayer({ width, height }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bufferRef = useRef<HTMLCanvasElement | null>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [nativeSize, setNativeSize] = useState<{
    w: number
    h: number
  } | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onLoaded = () => {
      setNativeSize({ w: video.videoWidth, h: video.videoHeight })
      setVideoReady(true)
    }
    video.addEventListener('loadeddata', onLoaded)
    return () => video.removeEventListener('loadeddata', onLoaded)
  }, [])

  useEffect(() => {
    if (!nativeSize) return
    const buffer = document.createElement('canvas')
    buffer.width = nativeSize.w
    buffer.height = nativeSize.h
    bufferRef.current = buffer
  }, [nativeSize])

  useAnimationFrame(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const buffer = bufferRef.current
    if (
      !video ||
      !canvas ||
      !buffer ||
      !nativeSize ||
      !videoReady ||
      video.paused ||
      video.ended
    )
      return

    const sw = nativeSize.w
    const sh = nativeSize.h

    // Ensure canvas matches native video resolution
    if (canvas.width !== sw || canvas.height !== sh) {
      canvas.width = sw
      canvas.height = sh
    }

    const bufCtx = buffer.getContext('2d', { willReadFrequently: true })
    const ctx = canvas.getContext('2d')
    if (!bufCtx || !ctx) return

    // Draw video frame at native resolution
    bufCtx.drawImage(video, 0, 0, sw, sh)

    const frame = bufCtx.getImageData(0, 0, sw, sh)
    const data = frame.data

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      // Convert to HSL for more accurate green screen detection
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const l = (max + min) / 2

      if (max === min) {
        // achromatic — not green
        continue
      }

      const d = max - min
      const s = l > 127 ? d / (510 - max - min) : d / (max + min)

      // Hue calculation
      let h: number
      if (max === r) {
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60
      } else if (max === g) {
        h = ((b - r) / d + 2) * 60
      } else {
        h = ((r - g) / d + 4) * 60
      }

      // Green hue range: roughly 80-160 degrees
      // With decent saturation and not too dark/light
      const isGreen = h >= 70 && h <= 170 && s > 0.15 && l > 20 && l < 240

      if (isGreen) {
        data[i + 3] = 0 // fully transparent
      } else {
        // Edge softening: if close to green range, partially transparent
        const hDist = h < 70 ? 70 - h : h > 170 ? h - 170 : 0
        if (hDist > 0 && hDist < 15 && s > 0.1) {
          data[i + 3] = Math.min(255, Math.round((hDist / 15) * 255))
        }
      }
    }

    ctx.clearRect(0, 0, sw, sh)
    ctx.putImageData(frame, 0, 0)
  })

  return (
    <>
      <video
        ref={videoRef}
        src="/subway-surfers.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="hidden"
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
          pointerEvents: 'none',
          width,
          height,
          objectFit: 'contain',
        }}
      />
    </>
  )
}
