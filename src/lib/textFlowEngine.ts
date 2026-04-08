import { layoutNextLine, type PreparedTextWithSegments, type LayoutCursor } from '@chenglou/pretext'
import type { FlowLine, CharSilhouette } from '../types'
import type { TrainRect } from './trainObstacles'

type LayoutNextLineFn = typeof layoutNextLine

const GAP = 14 // px gap between text and character edge
const TRAIN_GAP = 8 // px gap between text and train edge

type Segment = { left: number; right: number }

/**
 * Merge overlapping exclusion intervals, then compute the free (usable)
 * segments within [contentLeft, contentRight].
 */
function freeSegments(
  contentLeft: number,
  contentRight: number,
  exclusions: Segment[],
): Segment[] {
  if (exclusions.length === 0) return [{ left: contentLeft, right: contentRight }]

  // Sort by left edge
  const sorted = exclusions.slice().sort((a, b) => a.left - b.left)

  // Merge overlapping
  const merged: Segment[] = [sorted[0]]
  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1]
    if (sorted[i].left <= prev.right) {
      prev.right = Math.max(prev.right, sorted[i].right)
    } else {
      merged.push(sorted[i])
    }
  }

  // Compute free gaps
  const free: Segment[] = []
  let cursor = contentLeft
  for (const ex of merged) {
    const exLeft = Math.max(contentLeft, ex.left)
    const exRight = Math.min(contentRight, ex.right)
    if (exLeft > cursor) {
      free.push({ left: cursor, right: exLeft })
    }
    cursor = Math.max(cursor, exRight)
  }
  if (cursor < contentRight) {
    free.push({ left: cursor, right: contentRight })
  }
  return free
}

export function flowTextAroundBlob(
  prepared: PreparedTextWithSegments,
  layoutNextLine: LayoutNextLineFn,
  containerWidth: number,
  lineHeight: number,
  scrollTop: number,
  viewportWidth: number,
  viewportHeight: number,
  blobWidth: number,
  blobHeight: number,
  padding: number,
  silhouette: CharSilhouette | null,
  trainRects: TrainRect[],
  fontSize: number,
  characterOffsetX: number = 0,
  characterOffsetY: number = 0,
): { lines: FlowLine[]; totalHeight: number } {
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
  let y = 0
  const lines: FlowLine[] = []

  const blobCenterDocY = viewportHeight / 2 + scrollTop + characterOffsetY
  const blobCenterX = viewportWidth / 2 + characterOffsetX

  const contentLeft = padding
  const contentRight = containerWidth - padding
  const fullWidth = contentRight - contentLeft

  if (fullWidth <= 0) return { lines: [], totalHeight: 0 }

  const minGutter = fontSize * 4.5

  const MAX_LINES = 50000
  let lineCount = 0

  while (lineCount < MAX_LINES) {
    const lineCenterY = y + lineHeight / 2
    const yFromBlobCenter = lineCenterY - blobCenterDocY

    // Collect all exclusion zones for this line
    const exclusions: Segment[] = []

    // Character silhouette exclusion
    if (silhouette && silhouette.height > 0) {
      const silRow = Math.round(yFromBlobCenter + silhouette.height / 2)
      if (silRow >= 0 && silRow < silhouette.height) {
        const left = silhouette.leftEdges[silRow]
        const right = silhouette.rightEdges[silRow]
        if (right > left) {
          exclusions.push({
            left: blobCenterX + left - GAP,
            right: blobCenterX + right + GAP,
          })
        }
      }
    } else {
      if (Math.abs(yFromBlobCenter) < blobHeight / 2) {
        exclusions.push({
          left: blobCenterX - blobWidth / 2 - GAP,
          right: blobCenterX + blobWidth / 2 + GAP,
        })
      }
    }

    // Train exclusion zones (viewport coords → document coords)
    for (const tr of trainRects) {
      const trainDocTop = tr.top + scrollTop
      const trainDocBottom = tr.bottom + scrollTop
      if (y + lineHeight > trainDocTop && y < trainDocBottom) {
        exclusions.push({
          left: tr.left - TRAIN_GAP,
          right: tr.right + TRAIN_GAP,
        })
      }
    }

    // Compute free segments and filter out narrow gutters
    const segments = freeSegments(contentLeft, contentRight, exclusions)
      .filter((s) => s.right - s.left >= minGutter)

    if (segments.length > 0) {
      let broke = false
      for (const seg of segments) {
        const segWidth = seg.right - seg.left
        const result = layoutNextLine(prepared, cursor, segWidth)
        if (!result) { broke = true; break }
        lines.push({ text: result.text, x: seg.left, y, width: result.width })
        cursor = result.end
      }
      if (broke) break
    }
    // If no usable segments, skip this line (text continues on next line)

    y += lineHeight
    lineCount++
  }

  return { lines, totalHeight: y }
}
