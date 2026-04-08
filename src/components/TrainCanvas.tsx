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

type SpriteImages = {
  right: HTMLImageElement  // train-right.png → left track (track 0)
  center: HTMLImageElement // train-center.png → center track (track 1)
  left: HTMLImageElement   // train-left.png → right track (track 2)
}

function getSpriteForTrack(sprites: SpriteImages, track: number): HTMLImageElement {
  if (track === 0) return sprites.right
  if (track === 2) return sprites.left
  return sprites.center
}

function preloadImages(): Promise<SpriteImages> {
  const load = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })

  return Promise.all([
    load('/train-right.png'),
    load('/train-center.png'),
    load('/train-left.png'),
  ]).then(([right, center, left]) => ({ right, center, left }))
}

export function TrainCanvas({ trainRectsRef, onTrainUpdate }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trainsRef = useRef<Train[]>([])
  const lastSpawnRef = useRef(0)
  const spritesRef = useRef<SpriteImages | null>(null)
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

    // Draw each train using sprites
    for (const t of trains) {
      const sprite = getSpriteForTrack(sprites, t.track)
      const spriteAspect = sprite.naturalWidth / sprite.naturalHeight
      const boxAspect = t.width / t.height

      let drawW: number
      let drawH: number
      if (spriteAspect > boxAspect) {
        // Sprite is wider relative to box — fit to width
        drawW = t.width
        drawH = t.width / spriteAspect
      } else {
        // Sprite is taller relative to box — fit to height
        drawH = t.height
        drawW = t.height * spriteAspect
      }

      // Center the sprite on the train's bounding box
      const drawX = t.x + (t.width - drawW) / 2
      const drawY = t.y + (t.height - drawH) / 2

      ctx.save()
      if (t.hueRotation !== 0) {
        ctx.filter = `hue-rotate(${t.hueRotation}deg)`
      }
      ctx.drawImage(sprite, drawX, drawY, drawW, drawH)
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
