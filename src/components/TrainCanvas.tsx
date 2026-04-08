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
  onTrainUpdate?: (trains: Train[]) => void
}

function darkenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const f = 1 - amount
  return `rgb(${Math.round(r * f)}, ${Math.round(g * f)}, ${Math.round(b * f)})`
}

function lightenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${Math.min(255, Math.round(r + (255 - r) * amount))}, ${Math.min(255, Math.round(g + (255 - g) * amount))}, ${Math.min(255, Math.round(b + (255 - b) * amount))})`
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  tl: number, tr: number, br: number, bl: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + tl, y)
  ctx.lineTo(x + w - tr, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr)
  ctx.lineTo(x + w, y + h - br)
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h)
  ctx.lineTo(x + bl, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl)
  ctx.lineTo(x, y + tl)
  ctx.quadraticCurveTo(x, y, x + tl, y)
  ctx.closePath()
}

function drawTrain(ctx: CanvasRenderingContext2D, t: Train) {
  const { x, y, width: w, height: h, colorScheme } = t
  const { body, accent, stripe } = colorScheme

  // --- 1. Roof/top surface (3/4 perspective — visible top) ---
  const roofH = 14
  const roofInset = 6
  roundedRect(ctx, x + roofInset, y, w - roofInset * 2, roofH, 8, 8, 2, 2)
  ctx.fillStyle = '#8B8B00'
  ctx.fill()
  ctx.strokeStyle = darkenColor('#8B8B00', 0.3)
  ctx.lineWidth = 1.5
  ctx.stroke()

  // --- 2. Main body ---
  const bodyY = y + roofH - 2
  const bodyH = h - roofH - 22  // leave space for undercarriage
  roundedRect(ctx, x, bodyY, w, bodyH, 12, 12, 4, 4)
  ctx.fillStyle = body
  ctx.fill()

  // Right-side shading (3D depth)
  ctx.save()
  roundedRect(ctx, x, bodyY, w, bodyH, 12, 12, 4, 4)
  ctx.clip()
  const shadingGrad = ctx.createLinearGradient(x, bodyY, x + w, bodyY)
  shadingGrad.addColorStop(0, 'rgba(255,255,255,0.12)')
  shadingGrad.addColorStop(0.3, 'rgba(255,255,255,0)')
  shadingGrad.addColorStop(0.7, 'rgba(0,0,0,0)')
  shadingGrad.addColorStop(1, 'rgba(0,0,0,0.2)')
  ctx.fillStyle = shadingGrad
  ctx.fillRect(x, bodyY, w, bodyH)
  ctx.restore()

  // Body outline
  roundedRect(ctx, x, bodyY, w, bodyH, 12, 12, 4, 4)
  ctx.strokeStyle = '#1a1a1a'
  ctx.lineWidth = 2.5
  ctx.stroke()

  // --- 3. Accent patches (bottom corners, olive/colored) ---
  const patchH = 24
  const patchW = 22
  // Bottom-left accent
  ctx.fillStyle = accent
  roundedRect(ctx, x + 3, bodyY + bodyH - patchH - 2, patchW, patchH, 3, 3, 3, 3)
  ctx.fill()
  // Bottom-right accent
  roundedRect(ctx, x + w - patchW - 3, bodyY + bodyH - patchH - 2, patchW, patchH, 3, 3, 3, 3)
  ctx.fill()

  // --- 4. Front door/window (centered, upper area) ---
  const doorW = 36
  const doorH = 44
  const doorX = x + (w - doorW) / 2
  const doorY = bodyY + 16
  roundedRect(ctx, doorX, doorY, doorW, doorH, 6, 6, 6, 6)
  // Dark blue glass gradient
  const glassGrad = ctx.createLinearGradient(doorX, doorY, doorX, doorY + doorH)
  glassGrad.addColorStop(0, '#2C3E50')
  glassGrad.addColorStop(1, '#1A252F')
  ctx.fillStyle = glassGrad
  ctx.fill()
  ctx.strokeStyle = '#0d1117'
  ctx.lineWidth = 3
  ctx.stroke()

  // Glare highlight on door glass
  ctx.beginPath()
  ctx.moveTo(doorX + 5, doorY + 4)
  ctx.lineTo(doorX + doorW * 0.5, doorY + 4)
  ctx.lineTo(doorX + doorW * 0.35, doorY + doorH * 0.35)
  ctx.lineTo(doorX + 5, doorY + doorH * 0.35)
  ctx.closePath()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
  ctx.fill()

  // --- 5. Side windows (left edge — 3/4 perspective shows side) ---
  const sideWinW = 10
  const sideWinH = 16
  const sideWinX = x + 6
  const winColors = lightenColor(body, 0.15)
  for (let i = 0; i < 3; i++) {
    const wy = bodyY + 18 + i * (sideWinH + 6)
    if (wy + sideWinH > bodyY + bodyH - 10) break
    // Window frame (colored)
    roundedRect(ctx, sideWinX, wy, sideWinW, sideWinH, 2, 2, 2, 2)
    ctx.fillStyle = winColors
    ctx.fill()
    // Dark glass inside
    roundedRect(ctx, sideWinX + 2, wy + 2, sideWinW - 4, sideWinH - 4, 1, 1, 1, 1)
    ctx.fillStyle = '#1A252F'
    ctx.fill()
  }

  // --- 6. Horizontal stripe across lower third ---
  const stripeY = bodyY + bodyH * 0.62
  const stripeH = 10
  ctx.save()
  roundedRect(ctx, x, bodyY, w, bodyH, 12, 12, 4, 4)
  ctx.clip()
  ctx.fillStyle = stripe
  ctx.fillRect(x, stripeY, w, stripeH)
  ctx.restore()

  // --- 7. Undercarriage/bumper ---
  const underH = 14
  const underW = w + 8
  const underX = x - 4
  const underY = bodyY + bodyH
  roundedRect(ctx, underX, underY, underW, underH, 2, 2, 5, 5)
  ctx.fillStyle = '#2C3E50'
  ctx.fill()
  ctx.strokeStyle = '#1a1a1a'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // --- 8. Wheels ---
  const wheelR = 5
  const wheelY = underY + underH - 2
  const wheelPositions = [x + 18, x + w / 2, x + w - 18]
  for (const wx of wheelPositions) {
    ctx.beginPath()
    ctx.arc(wx, wheelY, wheelR, 0, Math.PI * 2)
    ctx.fillStyle = '#111'
    ctx.fill()
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // --- 9. Top highlight streak (light from left) ---
  ctx.save()
  roundedRect(ctx, x, bodyY, w, bodyH, 12, 12, 4, 4)
  ctx.clip()
  const highlightGrad = ctx.createLinearGradient(x, bodyY, x + 20, bodyY)
  highlightGrad.addColorStop(0, 'rgba(255,255,255,0.18)')
  highlightGrad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = highlightGrad
  ctx.fillRect(x, bodyY, 20, bodyH)
  ctx.restore()
}

export function TrainCanvas({ trainRectsRef, onTrainUpdate }: Props) {
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

    // Notify parent for autonomous dodge logic
    if (onTrainUpdate) onTrainUpdate(trains)
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
