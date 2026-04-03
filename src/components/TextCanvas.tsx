import { useRef, useCallback, useState, useEffect, type MutableRefObject } from 'react'
import { layoutNextLine, layout, type PreparedTextWithSegments } from '@chenglou/pretext'
import { useAnimationFrame } from '../hooks/useAnimationFrame'
import { flowTextAroundBlob } from '../lib/textFlowEngine'
import type { FlowLine, CharSilhouette } from '../types'

type Props = {
  prepared: PreparedTextWithSegments
  fontSize: number
  lineHeight: number
  blobWidth: number
  blobHeight: number
  silhouetteRef: MutableRefObject<CharSilhouette | null>
}

export function TextCanvas({
  prepared,
  fontSize,
  lineHeight,
  blobWidth,
  blobHeight,
  silhouetteRef,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const linesRef = useRef<FlowLine[]>([])
  const totalHeightRef = useRef(0)
  const scrollTopRef = useRef(0)
  const [docHeight, setDocHeight] = useState(5000) // initial estimate
  const padding = 60

  // Compute an initial height estimate from full-width layout
  useEffect(() => {
    const fullWidth = window.innerWidth - padding * 2
    if (fullWidth > 0) {
      const result = layout(prepared, fullWidth, lineHeight)
      // Add extra height to account for narrower lines around blob
      setDocHeight(result.height + blobHeight * 2)
    }
  }, [prepared, lineHeight, blobHeight])

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      scrollTopRef.current = scrollRef.current.scrollTop
    }
  }, [])

  // Main render loop: re-layout and paint each frame
  useAnimationFrame(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Resize canvas if needed
    if (canvas.width !== vw * dpr || canvas.height !== vh * dpr) {
      canvas.width = vw * dpr
      canvas.height = vh * dpr
      canvas.style.width = vw + 'px'
      canvas.style.height = vh + 'px'
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, vw, vh)

    const scrollTop = scrollTopRef.current

    // Flow text around blob
    const { lines, totalHeight } = flowTextAroundBlob(
      prepared,
      layoutNextLine,
      vw,
      lineHeight,
      scrollTop,
      vw,
      vh,
      blobWidth,
      blobHeight,
      padding,
      silhouetteRef.current,
    )

    linesRef.current = lines
    totalHeightRef.current = totalHeight

    // Update spacer height if it changed significantly
    if (Math.abs(totalHeight - docHeight) > lineHeight * 2) {
      setDocHeight(totalHeight + lineHeight * 4)
    }

    // Paint visible lines
    ctx.font = `${fontSize}px Inter`
    ctx.fillStyle = '#e5e5e5'
    ctx.textBaseline = 'top'

    for (const line of lines) {
      const viewportY = line.y - scrollTop
      if (viewportY + lineHeight < 0) continue
      if (viewportY > vh) continue
      ctx.fillText(line.text, line.x, viewportY)
    }
  })

  return (
    <>
      {/* Scroll container with spacer for native scrollbar */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          position: 'fixed',
          inset: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          zIndex: 1,
        }}
      >
        <div style={{ height: docHeight, pointerEvents: 'none' }} />
      </div>

      {/* Fixed canvas for text rendering */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />
    </>
  )
}
