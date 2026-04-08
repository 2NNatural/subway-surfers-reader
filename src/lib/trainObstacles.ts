export type TrainColorScheme = {
  body: string
  accent: string
  stripe: string
}

const TRAIN_COLOR_SCHEMES: TrainColorScheme[] = [
  { body: '#C0392B', accent: '#8B8B00', stripe: '#922B21' },   // Red
  { body: '#F4D03F', accent: '#8B8B00', stripe: '#C0392B' },   // Yellow
  { body: '#2E86C1', accent: '#1B4F72', stripe: '#1A5276' },   // Blue
  { body: '#17A589', accent: '#0E6655', stripe: '#117A65' },    // Teal
  { body: '#E67E22', accent: '#8B8B00', stripe: '#CA6F1E' },   // Orange
]

export type Train = {
  x: number      // left X position (viewport coords)
  y: number      // top Y position (viewport coords)
  width: number
  height: number
  speed: number   // px per frame (downward)
  color: string   // kept for backward compat
  colorScheme: TrainColorScheme
  track: number   // 0=left, 1=center, 2=right
}

export type TrainRect = {
  left: number
  right: number
  top: number
  bottom: number
}

export const TRAIN_WIDTH = 110
export const TRAIN_HEIGHT = 150
const MIN_SPEED = 2.5
const MAX_SPEED = 4.5
const SPAWN_INTERVAL = 2500 // ms between spawns

function randomColorScheme(): TrainColorScheme {
  return TRAIN_COLOR_SCHEMES[Math.floor(Math.random() * TRAIN_COLOR_SCHEMES.length)]
}

/**
 * Returns the center X position for a given track (0=left, 1=center, 2=right).
 * Tracks are evenly spaced across the viewport.
 */
export function trackCenterX(track: number, viewportWidth: number): number {
  const trackSpacing = 160
  const center = viewportWidth / 2
  return center + (track - 1) * trackSpacing
}

export function spawnTrain(viewportWidth: number): Train {
  // Trains spawn on left (0) or right (2) tracks only — never center
  const track = Math.random() < 0.5 ? 0 : 2
  const scheme = randomColorScheme()
  const cx = trackCenterX(track, viewportWidth)
  return {
    x: cx - TRAIN_WIDTH / 2,
    y: -TRAIN_HEIGHT,
    width: TRAIN_WIDTH,
    height: TRAIN_HEIGHT,
    speed: MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED),
    color: scheme.body,
    colorScheme: scheme,
    track,
  }
}

export function updateTrains(
  trains: Train[],
  viewportHeight: number,
  viewportWidth: number,
  lastSpawn: number,
  now: number,
): { trains: Train[]; lastSpawn: number } {
  // Move existing trains down
  const moved = trains
    .map((t) => ({ ...t, y: t.y + t.speed }))
    .filter((t) => t.y < viewportHeight + 50)

  // Spawn new train if enough time passed
  let nextSpawn = lastSpawn
  if (now - lastSpawn > SPAWN_INTERVAL) {
    moved.push(spawnTrain(viewportWidth))
    nextSpawn = now
  }

  return { trains: moved, lastSpawn: nextSpawn }
}

export function getTrainRects(trains: Train[]): TrainRect[] {
  return trains.map((t) => ({
    left: t.x,
    right: t.x + t.width,
    top: t.y,
    bottom: t.y + t.height,
  }))
}
