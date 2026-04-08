import { useState, useRef, useEffect, useCallback } from 'react'
import { usePretext } from '../hooks/usePretext'
import { TextCanvas } from '../components/TextCanvas'
import { VideoPlayer } from '../components/VideoPlayer'
import { TrainCanvas } from '../components/TrainCanvas'
import { ReaderControls } from '../components/ReaderControls'
import type { CharSilhouette } from '../types'
import type { TrainRect, Train } from '../lib/trainObstacles'
import { trackCenterX, TRAIN_WIDTH } from '../lib/trainObstacles'

type Props = {
  text: string
  onBack: () => void
}

const BLOB_WIDTH = 160
const BLOB_HEIGHT = 220
const TRACK_SPACING = 160 // px between track centers, matches trainObstacles
const DODGE_DISTANCE = 300 // how far ahead to detect approaching trains
const JUMP_DISTANCE = 230  // trigger jump when train is this close
const SLIDE_DURATION = 200 // ms for lane switch animation
const JUMP_UP_DURATION = 300
const JUMP_DOWN_DURATION = 300
const JUMP_HEIGHT = 150

export function ReaderPage({ text, onBack }: Props) {
  const [fontSize, setFontSize] = useState(18)
  const lineHeight = Math.round(fontSize * 1.6)
  const silhouetteRef = useRef<CharSilhouette | null>(null)
  const trainRectsRef = useRef<TrainRect[]>([])
  const trainsRef = useRef<Train[]>([])

  // Character autonomous movement state
  const characterTrack = useRef(1) // 0=left, 1=center, 2=right
  const offsetXRef = useRef(0)
  const offsetYRef = useRef(0)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const isSliding = useRef(false)
  const isJumping = useRef(false)

  const prepared = usePretext(text, fontSize)

  // Smooth slide animation between tracks
  const slideTo = useCallback((targetTrack: number) => {
    if (isSliding.current || targetTrack === characterTrack.current) return
    if (targetTrack < 0 || targetTrack > 2) return
    isSliding.current = true
    const startX = offsetXRef.current
    const endX = (targetTrack - 1) * TRACK_SPACING
    characterTrack.current = targetTrack
    const startTime = performance.now()

    const animate = () => {
      const elapsed = performance.now() - startTime
      const t = Math.min(1, elapsed / SLIDE_DURATION)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      const currentX = startX + (endX - startX) * eased
      offsetXRef.current = currentX
      setOffsetX(currentX)
      if (t < 1) {
        requestAnimationFrame(animate)
      } else {
        offsetXRef.current = endX
        setOffsetX(endX)
        isSliding.current = false
      }
    }
    requestAnimationFrame(animate)
  }, [])

  // Jump animation
  const triggerJump = useCallback(() => {
    if (isJumping.current) return
    isJumping.current = true
    const startTime = performance.now()
    const totalDuration = JUMP_UP_DURATION + JUMP_DOWN_DURATION

    const animate = () => {
      const elapsed = performance.now() - startTime
      if (elapsed < JUMP_UP_DURATION) {
        // Going up
        const t = elapsed / JUMP_UP_DURATION
        const eased = t * (2 - t) // ease out quad
        offsetYRef.current = -JUMP_HEIGHT * eased
        setOffsetY(-JUMP_HEIGHT * eased)
      } else if (elapsed < totalDuration) {
        // Coming down
        const t = (elapsed - JUMP_UP_DURATION) / JUMP_DOWN_DURATION
        const eased = t * t // ease in quad
        offsetYRef.current = -JUMP_HEIGHT * (1 - eased)
        setOffsetY(-JUMP_HEIGHT * (1 - eased))
      } else {
        offsetYRef.current = 0
        setOffsetY(0)
        isJumping.current = false
      }
      if (elapsed < totalDuration) {
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
  }, [])

  // Check if a train is approaching the character on a given track
  const isTrainOnTrack = useCallback((track: number, distance: number): boolean => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const charY = vh / 2 // character vertical center in viewport
    const trackX = trackCenterX(track, vw)

    for (const train of trainsRef.current) {
      const trainCenterX = train.x + train.width / 2
      // Check if train is on this track (within half a track width)
      if (Math.abs(trainCenterX - trackX) < TRAIN_WIDTH * 0.8) {
        // Check if train is approaching from above (within distance above character)
        const trainBottom = train.y + train.height
        if (trainBottom > charY - distance && train.y < charY + 60) {
          return true
        }
      }
    }
    return false
  }, [])

  // Autonomous dodge logic — runs each frame via the train canvas callback
  const handleTrainUpdate = useCallback((trains: Train[]) => {
    trainsRef.current = trains

    if (isSliding.current) return

    const currentTrack = characterTrack.current

    // Check if a train is approaching on current track
    if (isTrainOnTrack(currentTrack, DODGE_DISTANCE)) {
      // Try to dodge to an adjacent free lane
      const leftFree = currentTrack > 0 && !isTrainOnTrack(currentTrack - 1, DODGE_DISTANCE)
      const rightFree = currentTrack < 2 && !isTrainOnTrack(currentTrack + 1, DODGE_DISTANCE)

      if (leftFree && rightFree) {
        slideTo(Math.random() < 0.5 ? currentTrack - 1 : currentTrack + 1)
      } else if (leftFree) {
        slideTo(currentTrack - 1)
      } else if (rightFree) {
        slideTo(currentTrack + 1)
      } else {
        // Can't dodge — jump
        if (isTrainOnTrack(currentTrack, JUMP_DISTANCE)) {
          triggerJump()
        }
      }
    }
  }, [isTrainOnTrack, slideTo, triggerJump])

  // Random lane switching every 2-4 seconds
  useEffect(() => {
    const randomSwitch = () => {
      if (!isSliding.current) {
        const current = characterTrack.current
        // Pick a random adjacent lane
        const options: number[] = []
        if (current > 0) options.push(current - 1)
        if (current < 2) options.push(current + 1)
        if (options.length > 0) {
          const target = options[Math.floor(Math.random() * options.length)]
          // Only switch if target lane is free
          if (!isTrainOnTrack(target, DODGE_DISTANCE)) {
            slideTo(target)
          }
        }
      }
      // Schedule next random switch in 2-4 seconds
      const nextDelay = 2000 + Math.random() * 2000
      timerId = window.setTimeout(randomSwitch, nextDelay)
    }

    let timerId = window.setTimeout(randomSwitch, 2000 + Math.random() * 2000)
    return () => clearTimeout(timerId)
  }, [slideTo, isTrainOnTrack])

  if (!prepared) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/40">Loading font...</p>
      </div>
    )
  }

  return (
    <>
      <TextCanvas
        prepared={prepared}
        fontSize={fontSize}
        lineHeight={lineHeight}
        blobWidth={BLOB_WIDTH}
        blobHeight={BLOB_HEIGHT}
        silhouetteRef={silhouetteRef}
        trainRectsRef={trainRectsRef}
        characterOffsetX={offsetX}
        characterOffsetY={offsetY}
      />
      <VideoPlayer
        width={BLOB_WIDTH}
        height={BLOB_HEIGHT}
        silhouetteRef={silhouetteRef}
        offsetX={offsetX}
        offsetY={offsetY}
      />
      <TrainCanvas
        trainRectsRef={trainRectsRef}
        onTrainUpdate={handleTrainUpdate}
      />
      <ReaderControls
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        onBack={onBack}
      />
    </>
  )
}
