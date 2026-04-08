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

// ---- 3/4 overhead perspective train drawing ----
// The train is an oblique 3D box showing 3 faces:
//   1. ROOF (top surface receding into distance — drawn first, furthest back)
//   2. NEAR SIDE WALL (parallelogram on the camera-near side)
//   3. FRONT FACE (facing the player — drawn last, closest)
//
// The "vanishing direction" for depth lines depends on the track:
//   Left track (0): depth goes up-and-to-the-right
//   Center track (1): depth goes straight up
//   Right track (2): depth goes up-and-to-the-left

const FRONT_W = 100  // front face width
const FRONT_H = 60   // front face height
const DEPTH = 150    // how far the roof/side recede upward on screen
const SIDE_W = 25    // side wall width on screen
const HORIZ_SHIFT = 18 // horizontal perspective shift for left/right tracks

function getDepthOffset(track: number): { dx: number; dy: number } {
  // dx = horizontal shift per unit of depth, dy = always upward
  if (track === 0) return { dx: HORIZ_SHIFT, dy: -DEPTH }  // left track → depth goes up-right
  if (track === 2) return { dx: -HORIZ_SHIFT, dy: -DEPTH }  // right track → depth goes up-left
  return { dx: 0, dy: -DEPTH }                               // center → straight up
}

function drawTrain(ctx: CanvasRenderingContext2D, t: Train) {
  const { x, y, width: w, height: h, colorScheme, track } = t
  const { body, roof, stripe, accent } = colorScheme

  // The front face sits at the BOTTOM of the bounding box
  const frontX = x + (w - FRONT_W) / 2
  const frontY = y + h - FRONT_H

  const { dx, dy } = getDepthOffset(track)

  // Determine which side is "near" to the camera
  // Left track: near side is the RIGHT side of the train
  // Right track: near side is the LEFT side
  // Center track: show a small right side
  const nearSideIsRight = track === 0 || track === 1
  const sideW = track === 1 ? 15 : SIDE_W

  // ============================================================
  // STEP 1: ROOF / TOP SURFACE (furthest back, draw first)
  // ============================================================
  // Bottom edge = top edge of front face
  // Top edge = same edge shifted by (dx, dy) — narrower due to perspective
  const roofNarrow = 12 // how much narrower the far edge is on each side
  ctx.beginPath()
  // Bottom-left of roof = top-left of front face
  ctx.moveTo(frontX, frontY)
  // Bottom-right of roof = top-right of front face
  ctx.lineTo(frontX + FRONT_W, frontY)
  // Top-right (far edge, narrower)
  ctx.lineTo(frontX + FRONT_W - roofNarrow + dx, frontY + dy)
  // Top-left (far edge, narrower)
  ctx.lineTo(frontX + roofNarrow + dx, frontY + dy)
  ctx.closePath()

  // Roof gradient: lighter near bottom (close), darker at top (far)
  const roofGrad = ctx.createLinearGradient(frontX, frontY + dy, frontX, frontY)
  roofGrad.addColorStop(0, darkenColor(roof, 0.25))
  roofGrad.addColorStop(1, roof)
  ctx.fillStyle = roofGrad
  ctx.fill()
  ctx.strokeStyle = darkenColor(roof, 0.35)
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Panel lines on roof (lengthwise)
  ctx.save()
  ctx.globalAlpha = 0.3
  ctx.strokeStyle = darkenColor(roof, 0.4)
  ctx.lineWidth = 1
  for (let i = 1; i <= 3; i++) {
    const frac = i / 4
    const bx = frontX + FRONT_W * frac
    const tx = frontX + roofNarrow + (FRONT_W - roofNarrow * 2) * frac + dx
    ctx.beginPath()
    ctx.moveTo(bx, frontY)
    ctx.lineTo(tx, frontY + dy)
    ctx.stroke()
  }
  ctx.restore()

  // ============================================================
  // STEP 2: NEAR SIDE WALL (middle layer)
  // ============================================================
  // A parallelogram on the near side, receding backward at the same angle
  ctx.beginPath()
  if (nearSideIsRight) {
    // Bottom-left = front face top-right corner
    ctx.moveTo(frontX + FRONT_W, frontY + FRONT_H)
    // Bottom-right
    ctx.lineTo(frontX + FRONT_W + sideW, frontY + FRONT_H)
    // Top-right (recedes backward)
    ctx.lineTo(frontX + FRONT_W + sideW + dx - 4, frontY + dy)
    // Top-left (connects to roof far edge)
    ctx.lineTo(frontX + FRONT_W - roofNarrow + dx, frontY + dy)
  } else {
    // Left side
    ctx.moveTo(frontX, frontY + FRONT_H)
    ctx.lineTo(frontX - sideW, frontY + FRONT_H)
    ctx.lineTo(frontX - sideW + dx + 4, frontY + dy)
    ctx.lineTo(frontX + roofNarrow + dx, frontY + dy)
  }
  ctx.closePath()

  // Side wall fill — darker than body (shadow side)
  const sideGrad = ctx.createLinearGradient(
    nearSideIsRight ? frontX + FRONT_W : frontX - sideW,
    frontY + dy,
    nearSideIsRight ? frontX + FRONT_W : frontX - sideW,
    frontY + FRONT_H,
  )
  sideGrad.addColorStop(0, darkenColor(body, 0.35))
  sideGrad.addColorStop(1, darkenColor(body, 0.2))
  ctx.fillStyle = sideGrad
  ctx.fill()
  ctx.strokeStyle = darkenColor(body, 0.4)
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Side windows (3-4 small rectangles running up the side)
  ctx.save()
  ctx.beginPath()
  if (nearSideIsRight) {
    ctx.moveTo(frontX + FRONT_W, frontY + FRONT_H)
    ctx.lineTo(frontX + FRONT_W + sideW, frontY + FRONT_H)
    ctx.lineTo(frontX + FRONT_W + sideW + dx - 4, frontY + dy)
    ctx.lineTo(frontX + FRONT_W - roofNarrow + dx, frontY + dy)
  } else {
    ctx.moveTo(frontX, frontY + FRONT_H)
    ctx.lineTo(frontX - sideW, frontY + FRONT_H)
    ctx.lineTo(frontX - sideW + dx + 4, frontY + dy)
    ctx.lineTo(frontX + roofNarrow + dx, frontY + dy)
  }
  ctx.closePath()
  ctx.clip()

  const winCount = 4
  const totalSideH = FRONT_H + Math.abs(dy)
  const winSpacing = totalSideH / (winCount + 1)
  const winH = 14
  const winW = sideW - 8
  for (let i = 1; i <= winCount; i++) {
    const wy = frontY + FRONT_H - winSpacing * i
    const interpT = (frontY + FRONT_H - wy) / totalSideH
    const wxBase = nearSideIsRight
      ? frontX + FRONT_W + 4 + dx * interpT
      : frontX - sideW + 4 + dx * interpT

    // Window frame
    ctx.fillStyle = lightenColor(body, 0.1)
    ctx.fillRect(wxBase, wy, winW, winH)
    // Dark glass
    ctx.fillStyle = '#1A252F'
    ctx.fillRect(wxBase + 2, wy + 2, winW - 4, winH - 4)
  }

  // Colored horizontal stripe on the side
  const sideStripeY = frontY + FRONT_H * 0.3
  ctx.fillStyle = stripe
  ctx.globalAlpha = 0.7
  ctx.fillRect(
    nearSideIsRight ? frontX + FRONT_W : frontX - sideW,
    sideStripeY,
    sideW + Math.abs(dx) + 8,
    8,
  )
  ctx.globalAlpha = 1.0
  ctx.restore()

  // ============================================================
  // STEP 3: FRONT FACE (closest to camera, draw last)
  // ============================================================
  // A rectangle at the bottom of the train shape
  ctx.beginPath()
  ctx.rect(frontX, frontY, FRONT_W, FRONT_H)
  ctx.fillStyle = body
  ctx.fill()

  // Left highlight (light from left)
  ctx.save()
  ctx.beginPath()
  ctx.rect(frontX, frontY, FRONT_W, FRONT_H)
  ctx.clip()
  const hlGrad = ctx.createLinearGradient(frontX, frontY, frontX + FRONT_W, frontY)
  hlGrad.addColorStop(0, 'rgba(255,255,255,0.15)')
  hlGrad.addColorStop(0.25, 'rgba(255,255,255,0)')
  hlGrad.addColorStop(0.75, 'rgba(0,0,0,0)')
  hlGrad.addColorStop(1, 'rgba(0,0,0,0.1)')
  ctx.fillStyle = hlGrad
  ctx.fillRect(frontX, frontY, FRONT_W, FRONT_H)
  ctx.restore()

  // Thick dark outline
  ctx.strokeStyle = '#1a1a1a'
  ctx.lineWidth = 2.5
  ctx.strokeRect(frontX, frontY, FRONT_W, FRONT_H)

  // -- Bumper/coupler at the very bottom --
  const bumperH = 10
  const bumperW = FRONT_W + 6
  const bumperX = frontX - 3
  const bumperY = frontY + FRONT_H - bumperH
  ctx.fillStyle = '#2C3E50'
  ctx.fillRect(bumperX, bumperY, bumperW, bumperH)
  ctx.strokeStyle = '#1a1a1a'
  ctx.lineWidth = 1.5
  ctx.strokeRect(bumperX, bumperY, bumperW, bumperH)

  // Coupler center nub
  ctx.fillStyle = '#566573'
  ctx.fillRect(frontX + FRONT_W / 2 - 8, bumperY + 2, 16, 6)

  // -- Horizontal stripe across front face --
  const fStripeY = frontY + FRONT_H * 0.55
  const fStripeH = 8
  ctx.save()
  ctx.beginPath()
  ctx.rect(frontX, frontY, FRONT_W, FRONT_H)
  ctx.clip()
  ctx.fillStyle = stripe
  ctx.fillRect(frontX, fStripeY, FRONT_W, fStripeH)
  ctx.restore()

  // -- Large windshield/window (upper portion) --
  const winW2 = FRONT_W * 0.65
  const winH2 = 22
  const winX = frontX + (FRONT_W - winW2) / 2
  const winY = frontY + 6
  ctx.beginPath()
  ctx.moveTo(winX + 4, winY)
  ctx.lineTo(winX + winW2 - 4, winY)
  ctx.quadraticCurveTo(winX + winW2, winY, winX + winW2, winY + 4)
  ctx.lineTo(winX + winW2, winY + winH2 - 4)
  ctx.quadraticCurveTo(winX + winW2, winY + winH2, winX + winW2 - 4, winY + winH2)
  ctx.lineTo(winX + 4, winY + winH2)
  ctx.quadraticCurveTo(winX, winY + winH2, winX, winY + winH2 - 4)
  ctx.lineTo(winX, winY + 4)
  ctx.quadraticCurveTo(winX, winY, winX + 4, winY)
  ctx.closePath()

  const glassGrad = ctx.createLinearGradient(winX, winY, winX, winY + winH2)
  glassGrad.addColorStop(0, '#2C3E50')
  glassGrad.addColorStop(1, '#1A252F')
  ctx.fillStyle = glassGrad
  ctx.fill()
  ctx.strokeStyle = '#0d1117'
  ctx.lineWidth = 2.5
  ctx.stroke()

  // Glare on windshield
  ctx.beginPath()
  ctx.moveTo(winX + 4, winY + 3)
  ctx.lineTo(winX + winW2 * 0.45, winY + 3)
  ctx.lineTo(winX + winW2 * 0.3, winY + winH2 * 0.45)
  ctx.lineTo(winX + 4, winY + winH2 * 0.45)
  ctx.closePath()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)'
  ctx.fill()

  // -- Headlights (two circles below the windshield) --
  const headlightY = frontY + FRONT_H * 0.52
  const headlightR = 5
  for (const hlx of [frontX + 16, frontX + FRONT_W - 16]) {
    // Glow
    const glow = ctx.createRadialGradient(hlx, headlightY, 0, hlx, headlightY, headlightR * 2.5)
    glow.addColorStop(0, 'rgba(255, 240, 150, 0.4)')
    glow.addColorStop(1, 'rgba(255, 240, 150, 0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(hlx, headlightY, headlightR * 2.5, 0, Math.PI * 2)
    ctx.fill()
    // Light
    ctx.beginPath()
    ctx.arc(hlx, headlightY, headlightR, 0, Math.PI * 2)
    ctx.fillStyle = '#FFF3B0'
    ctx.fill()
    ctx.strokeStyle = '#B7950B'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  // -- Chevron/arrow warning stripes (white V-shapes) --
  ctx.save()
  ctx.beginPath()
  ctx.rect(frontX, frontY, FRONT_W, FRONT_H)
  ctx.clip()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
  ctx.lineWidth = 2
  const chevronY = frontY + FRONT_H * 0.72
  const chevronCX = frontX + FRONT_W / 2
  for (let i = 0; i < 2; i++) {
    const cy = chevronY + i * 8
    ctx.beginPath()
    ctx.moveTo(chevronCX - 22, cy)
    ctx.lineTo(chevronCX, cy - 5)
    ctx.lineTo(chevronCX + 22, cy)
    ctx.stroke()
  }
  ctx.restore()

  // -- Accent patches on front face bottom corners --
  const patchW = 18
  const patchH = 12
  ctx.fillStyle = accent
  ctx.fillRect(frontX + 3, bumperY - patchH - 1, patchW, patchH)
  ctx.fillRect(frontX + FRONT_W - patchW - 3, bumperY - patchH - 1, patchW, patchH)
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
