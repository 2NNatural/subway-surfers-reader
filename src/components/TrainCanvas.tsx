import { useRef, useEffect, useState, type MutableRefObject } from 'react'
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

/** Sprite sheet images keyed by track assignment */
type SpriteSheets = {
  right: HTMLImageElement  // train-sheet-right.png → LEFT track (track 0)
  center: HTMLImageElement // train-sheet-center.png → CENTER track (track 1)
  left: HTMLImageElement   // train-sheet-left.png → RIGHT track (track 2)
}

const FRAME_WIDTH = 160
const FRAME_HEIGHT = 200
const NUM_FRAMES = 8

function getSheetForTrack(sheets: SpriteSheets, track: number): HTMLImageElement {
  if (track === 0) return sheets.right
  if (track === 2) return sheets.left
  return sheets.center
}

function preloadImages(): Promise<SpriteSheets> {
  const load = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })

  return Promise.all([
    load('/train-sheet-right.png'),
    load('/train-sheet-center.png'),
    load('/train-sheet-left.png'),
  ]).then(([right, center, left]) => ({ right, center, left }))
}

export function TrainCanvas({ trainRectsRef, onTrainUpdate }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trainsRef = useRef<Train[]>([])
  const lastSpawnRef = useRef(0)
  const spritesRef = useRef<SpriteSheets | null>(null)
  const [spritesLoaded, setSpritesLoaded] = useState(false)

  useEffect(() => {
    preloadImages().then((sprites) => {
      spritesRef.current = sprites
      setSpritesLoaded(true)
    })
  }, [])

  useAnimationFrame((time) => {
    const canvas = canvasRef.current
    if (!canvas || !spritesLoaded || !spritesRef.current) return

    const sprites = spritesRef.current
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

    // Draw each train using sprite sheet frames based on Y position
    for (const t of trains) {
      const sheet = getSheetForTrack(sprites, t.track)

      // Pick frame based on Y position: top of viewport → frame 0, bottom → frame 7
      const yNorm = Math.max(0, Math.min(1, t.y / vh))
      const frameIndex = Math.min(Math.floor(yNorm * NUM_FRAMES), NUM_FRAMES - 1)
      const sx = frameIndex * FRAME_WIDTH

      // Fit frame (160x200) into train bounding box while preserving aspect ratio
      const frameAspect = FRAME_WIDTH / FRAME_HEIGHT
      const boxAspect = t.width / t.height

      let drawW: number
      let drawH: number
      if (frameAspect > boxAspect) {
        drawW = t.width
        drawH = t.width / frameAspect
      } else {
        drawH = t.height
        drawW = t.height * frameAspect
      }

      const drawX = t.x + (t.width - drawW) / 2
      const drawY = t.y + (t.height - drawH) / 2

      ctx.save()
      if (t.hueRotation !== 0) {
        ctx.filter = `hue-rotate(${t.hueRotation}deg)`
      }
      ctx.drawImage(sheet, sx, 0, FRAME_WIDTH, FRAME_HEIGHT, drawX, drawY, drawW, drawH)
      ctx.restore()
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
