import { useRef, type MutableRefObject } from 'react'
import { useAnimationFrame } from '../hooks/useAnimationFrame'
import {
  type Train,
  type TrainRect,
  updateTrains,
  getTrainRects,
  spawnTrain,
} from '../lib/trainObstacles'

type Props = {
  trainRectsRef: MutableRefObject<TrainRect[]>
}

function drawTrain(ctx: CanvasRenderingContext2D, t: Train) {
  const { x, y, width: w, height: h, color } = t
  const cx = x + w / 2

  // --- Bumper / cowcatcher at the very bottom ---
  const bumperH = 14
  const bumperW = w + 12
  const bumperX = cx - bumperW / 2
  const bumperY = y + h - bumperH
  ctx.fillStyle = '#2c2c2c'
  ctx.fillRect(bumperX, bumperY, bumperW, bumperH)
  // Red accent stripe on bumper
  ctx.fillStyle = '#c0392b'
  ctx.fillRect(bumperX + 4, bumperY + 2, bumperW - 8, 4)

  // --- Main body with rounded top corners ---
  const bodyY = y
  const bodyH = h - bumperH
  const radius = 10
  ctx.beginPath()
  ctx.moveTo(x, bodyY + bodyH)
  ctx.lineTo(x, bodyY + radius)
  ctx.quadraticCurveTo(x, bodyY, x + radius, bodyY)
  ctx.lineTo(x + w - radius, bodyY)
  ctx.quadraticCurveTo(x + w, bodyY, x + w, bodyY + radius)
  ctx.lineTo(x + w, bodyY + bodyH)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()

  // Thick dark outline around body
  ctx.strokeStyle = '#1a1a1a'
  ctx.lineWidth = 3
  ctx.stroke()

  // --- Vertical panel lines ---
  ctx.strokeStyle = darkenColor(color, 0.25)
  ctx.lineWidth = 1.5
  const panelPositions = [0.33, 0.5, 0.67]
  for (const frac of panelPositions) {
    const px = x + w * frac
    ctx.beginPath()
    ctx.moveTo(px, bodyY + radius + 2)
    ctx.lineTo(px, bodyY + bodyH - 2)
    ctx.stroke()
  }

  // --- Large windshield / window near the top ---
  const winMargin = 10
  const winTop = bodyY + 12
  const winW = w - winMargin * 2
  const winH = bodyH * 0.32
  const winR = 6
  ctx.beginPath()
  ctx.moveTo(x + winMargin, winTop + winH)
  ctx.lineTo(x + winMargin, winTop + winR)
  ctx.quadraticCurveTo(x + winMargin, winTop, x + winMargin + winR, winTop)
  ctx.lineTo(x + winMargin + winW - winR, winTop)
  ctx.quadraticCurveTo(x + winMargin + winW, winTop, x + winMargin + winW, winTop + winR)
  ctx.lineTo(x + winMargin + winW, winTop + winH)
  ctx.closePath()
  ctx.fillStyle = 'rgba(173, 216, 230, 0.55)'
  ctx.fill()
  ctx.strokeStyle = '#1a1a1a'
  ctx.lineWidth = 2
  ctx.stroke()

  // Glare highlight on windshield
  ctx.beginPath()
  ctx.moveTo(x + winMargin + 6, winTop + 5)
  ctx.lineTo(x + winMargin + winW * 0.45, winTop + 5)
  ctx.lineTo(x + winMargin + winW * 0.3, winTop + winH * 0.4)
  ctx.lineTo(x + winMargin + 6, winTop + winH * 0.4)
  ctx.closePath()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
  ctx.fill()

  // --- Two round headlights near the bottom ---
  const lightY = bodyY + bodyH - 24
  const lightRadius = 8
  const lightOffsets = [w * 0.25, w * 0.75]
  for (const ox of lightOffsets) {
    const lx = x + ox
    // Glow behind
    const glow = ctx.createRadialGradient(lx, lightY, 0, lx, lightY, lightRadius * 2.5)
    glow.addColorStop(0, 'rgba(255, 255, 180, 0.5)')
    glow.addColorStop(1, 'rgba(255, 255, 180, 0)')
    ctx.beginPath()
    ctx.arc(lx, lightY, lightRadius * 2.5, 0, Math.PI * 2)
    ctx.fillStyle = glow
    ctx.fill()
    // Main light
    ctx.beginPath()
    ctx.arc(lx, lightY, lightRadius, 0, Math.PI * 2)
    ctx.fillStyle = '#fffde0'
    ctx.fill()
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

function darkenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const f = 1 - amount
  return `rgb(${Math.round(r * f)}, ${Math.round(g * f)}, ${Math.round(b * f)})`
}

export function TrainCanvas({ trainRectsRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trainsRef = useRef<Train[]>([])
  const lastSpawnRef = useRef(0)

  useAnimationFrame((time) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    const vw = window.innerWidth
    const vh = window.innerHeight

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

    // Bootstrap first train
    if (trainsRef.current.length === 0 && lastSpawnRef.current === 0) {
      trainsRef.current = [spawnTrain(vw)]
      lastSpawnRef.current = time
    }

    // Update train positions & spawn new ones
    const { trains, lastSpawn } = updateTrains(
      trainsRef.current,
      vh,
      vw,
      lastSpawnRef.current,
      time,
    )
    trainsRef.current = trains
    lastSpawnRef.current = lastSpawn

    // Draw each train
    for (const t of trains) {
      drawTrain(ctx, t)
    }

    // Update trainRectsRef for text exclusion zones
    trainRectsRef.current = getTrainRects(trains)
  })

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 5,
        pointerEvents: 'none',
      }}
    />
  )
}
