const TRAIN_COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#e67e22'] as const

export type Train = {
  x: number      // center X position (viewport coords)
  y: number      // top Y position (viewport coords)
  width: number
  height: number
  speed: number   // px per frame (downward)
  color: string
}

export type TrainRect = {
  left: number
  right: number
  top: number
  bottom: number
}

const TRAIN_WIDTH = 90
const TRAIN_HEIGHT = 140
const MIN_SPEED = 2.5
const MAX_SPEED = 4.5
const SPAWN_INTERVAL = 2500 // ms between spawns

function randomColor(): string {
  return TRAIN_COLORS[Math.floor(Math.random() * TRAIN_COLORS.length)]
}

function randomTrackX(viewportWidth: number): number {
  // Trains appear on left or right side, avoiding the center character area
  const margin = 120
  const centerExclusion = viewportWidth * 0.35
  const leftZone = margin
  const rightZone = viewportWidth - margin - TRAIN_WIDTH
  const centerLeft = (viewportWidth - centerExclusion) / 2
  const centerRight = (viewportWidth + centerExclusion) / 2

  // Pick left or right side randomly
  if (Math.random() < 0.5) {
    // Left side
    return leftZone + Math.random() * Math.max(0, centerLeft - leftZone - TRAIN_WIDTH)
  } else {
    // Right side
    return centerRight + Math.random() * Math.max(0, rightZone - centerRight)
  }
}

export function spawnTrain(viewportWidth: number): Train {
  return {
    x: randomTrackX(viewportWidth),
    y: -TRAIN_HEIGHT,
    width: TRAIN_WIDTH,
    height: TRAIN_HEIGHT,
    speed: MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED),
    color: randomColor(),
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
