import { useRef, useEffect, useState, type MutableRefObject } from 'react'
import { useAnimationFrame } from '../hooks/useAnimationFrame'
import type { CharSilhouette } from '../types'

type Props = {
  width: number
  height: number
  silhouetteRef: MutableRefObject<CharSilhouette | null>
}

// Chroma key constants — magenta background RGB(255, 0, 246)
const KEY_R = 255, KEY_G = 0, KEY_B = 246
const INNER_THRESH = 110
const OUTER_THRESH = 180
const INNER_SQ = INNER_THRESH * INNER_THRESH
const OUTER_SQ = OUTER_THRESH * OUTER_THRESH
const RANGE = OUTER_THRESH - INNER_THRESH
const CROP_PAD = 10

// Temporal smoothing: edges expand instantly, shrink slowly
const SHRINK_RATE = 0.04

export function VideoPlayer({ width, height, silhouetteRef }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bufferRef = useRef<HTMLCanvasElement | null>(null)
  const cropRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [nativeSize, setNativeSize] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onLoaded = () => {
      setNativeSize({ w: video.videoWidth, h: video.videoHeight })
      setVideoReady(true)
      video.play().catch(() => {
        const resume = () => {
          video.play()
          document.removeEventListener('click', resume)
          document.removeEventListener('keydown', resume)
        }
        document.addEventListener('click', resume)
        document.addEventListener('keydown', resume)
      })
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
    if (!video || !canvas || !buffer || !nativeSize || !videoReady) return

    const sw = nativeSize.w
    const sh = nativeSize.h

    const bufCtx = buffer.getContext('2d', { willReadFrequently: true })
    if (!bufCtx) return

    bufCtx.drawImage(video, 0, 0, sw, sh)
    const frame = bufCtx.getImageData(0, 0, sw, sh)
    const data = frame.data

    // Per-row edge tracking in native video pixels
    const rowMinX = new Int32Array(sh).fill(sw)
    const rowMaxX = new Int32Array(sh).fill(0)
    let charMinY = sh, charMaxY = 0

    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const i = (y * sw + x) * 4
        const r = data[i], g = data[i + 1], b = data[i + 2]
        const dr = r - KEY_R, dg = g - KEY_G, db = b - KEY_B
        const distSq = dr * dr + dg * dg + db * db

        if (distSq < INNER_SQ) {
          data[i + 3] = 0
        } else if (distSq < OUTER_SQ) {
          const dist = Math.sqrt(distSq)
          const t = (dist - INNER_THRESH) / RANGE
          data[i + 3] = Math.round(t * t * (3 - 2 * t) * 255)
          const spill = 1 - t
          data[i] = Math.round(r - spill * Math.max(0, r - g) * 0.6)
          data[i + 2] = Math.round(b - spill * Math.max(0, b - g) * 0.6)
          // Character edge pixel
          if (x < rowMinX[y]) rowMinX[y] = x
          if (x > rowMaxX[y]) rowMaxX[y] = x
          if (y < charMinY) charMinY = y
          if (y > charMaxY) charMaxY = y
        } else {
          // Opaque character pixel
          if (x < rowMinX[y]) rowMinX[y] = x
          if (x > rowMaxX[y]) rowMaxX[y] = x
          if (y < charMinY) charMinY = y
          if (y > charMaxY) charMaxY = y
        }
      }
    }

    if (charMaxY <= charMinY) return

    // Update crop box (grow only, never shrink, so canvas doesn't flicker)
    const pad = CROP_PAD
    const prev = cropRef.current
    if (!prev) {
      cropRef.current = {
        x: Math.max(0, charMinY > 0 ? Math.min(...Array.from(rowMinX.slice(charMinY, charMaxY + 1))) - pad : 0),
        y: Math.max(0, charMinY - pad),
        w: 0, h: 0,
      }
      // Compute w/h after setting x/y
      const minXAll = Math.max(0, Math.min(...Array.from(rowMinX.slice(charMinY, charMaxY + 1)).filter(v => v < sw)) - pad)
      const maxXAll = Math.min(sw, Math.max(...Array.from(rowMaxX.slice(charMinY, charMaxY + 1)).filter(v => v > 0)) + pad + 1)
      cropRef.current = {
        x: minXAll, y: Math.max(0, charMinY - pad),
        w: maxXAll - minXAll, h: Math.min(sh, charMaxY + 1 + pad) - Math.max(0, charMinY - pad),
      }
    } else {
      const activeMinX = rowMinX.slice(charMinY, charMaxY + 1)
      const activeMaxX = rowMaxX.slice(charMinY, charMaxY + 1)
      let fMinX = sw, fMaxX = 0
      for (let i = 0; i < activeMinX.length; i++) {
        if (activeMinX[i] < fMinX) fMinX = activeMinX[i]
        if (activeMaxX[i] > fMaxX) fMaxX = activeMaxX[i]
      }
      const newX = Math.min(prev.x, Math.max(0, fMinX - pad))
      const newY = Math.min(prev.y, Math.max(0, charMinY - pad))
      const newR = Math.max(prev.x + prev.w, Math.min(sw, fMaxX + 1 + pad))
      const newB = Math.max(prev.y + prev.h, Math.min(sh, charMaxY + 1 + pad))
      cropRef.current = { x: newX, y: newY, w: newR - newX, h: newB - newY }
    }

    const crop = cropRef.current

    // Build silhouette in display coordinates
    // Scale: native crop pixels → display pixels
    const scaleX = width / crop.w
    const scaleY = height / crop.h
    const displayH = height
    const centerXNative = crop.x + crop.w / 2

    // Current frame's edges in display pixels (from center)
    const curLeft = new Float32Array(displayH)
    const curRight = new Float32Array(displayH)

    for (let dy = 0; dy < displayH; dy++) {
      // Map display row back to native Y
      const nativeY = Math.round(crop.y + (dy / scaleY))
      if (nativeY < 0 || nativeY >= sh || rowMinX[nativeY] >= sw) {
        curLeft[dy] = 0
        curRight[dy] = 0
      } else {
        curLeft[dy] = (rowMinX[nativeY] - centerXNative) * scaleX
        curRight[dy] = (rowMaxX[nativeY] - centerXNative) * scaleX
      }
    }

    // Temporal smoothing against previous silhouette
    const prevSil = silhouetteRef.current
    if (prevSil && prevSil.height === displayH) {
      for (let dy = 0; dy < displayH; dy++) {
        // Expand instantly (take wider), shrink slowly
        const pl = prevSil.leftEdges[dy]
        const pr = prevSil.rightEdges[dy]
        const cl = curLeft[dy]
        const cr = curRight[dy]
        // left edge: more negative = wider
        curLeft[dy] = cl < pl ? cl : pl + (cl - pl) * SHRINK_RATE
        // right edge: more positive = wider
        curRight[dy] = cr > pr ? cr : pr + (cr - pr) * SHRINK_RATE
      }
    }

    silhouetteRef.current = {
      leftEdges: curLeft,
      rightEdges: curRight,
      height: displayH,
      width,
    }

    // Render cropped + keyed frame
    if (canvas.width !== crop.w || canvas.height !== crop.h) {
      canvas.width = crop.w
      canvas.height = crop.h
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, crop.w, crop.h)
    ctx.putImageData(frame, -crop.x, -crop.y)
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
        style={{
          position: 'fixed',
          top: 0, left: 0,
          width: 1, height: 1,
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -1,
        }}
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
          background: 'transparent',
        }}
      />
    </>
  )
}
