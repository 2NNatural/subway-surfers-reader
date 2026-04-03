import { layoutNextLine, type PreparedTextWithSegments, type LayoutCursor } from '@chenglou/pretext'
import type { FlowLine, CharSilhouette } from '../types'

type LayoutNextLineFn = typeof layoutNextLine

const GAP = 14 // px gap between text and character edge
const MIN_GUTTER = 40 // minimum width to lay out text in

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
): { lines: FlowLine[]; totalHeight: number } {
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
  let y = 0
  const lines: FlowLine[] = []

  const blobCenterDocY = viewportHeight / 2 + scrollTop
  const blobCenterX = viewportWidth / 2

  const contentLeft = padding
  const contentRight = containerWidth - padding
  const fullWidth = contentRight - contentLeft

  if (fullWidth <= 0) return { lines: [], totalHeight: 0 }

  const MAX_LINES = 50000
  let lineCount = 0

  while (lineCount < MAX_LINES) {
    const lineCenterY = y + lineHeight / 2
    const yFromBlobCenter = lineCenterY - blobCenterDocY

    // Check if this line is within the character's vertical range
    let exclusionLeft: number | null = null
    let exclusionRight: number | null = null

    if (silhouette && silhouette.height > 0) {
      // Map document Y to silhouette row
      const silRow = Math.round(yFromBlobCenter + silhouette.height / 2)
      if (silRow >= 0 && silRow < silhouette.height) {
        const left = silhouette.leftEdges[silRow]
        const right = silhouette.rightEdges[silRow]
        // Only create exclusion if this row has actual character pixels
        if (right > left) {
          exclusionLeft = blobCenterX + left - GAP
          exclusionRight = blobCenterX + right + GAP
        }
      }
    } else {
      // Fallback to simple rectangular exclusion if no silhouette yet
      if (Math.abs(yFromBlobCenter) < blobHeight / 2) {
        exclusionLeft = blobCenterX - blobWidth / 2 - GAP
        exclusionRight = blobCenterX + blobWidth / 2 + GAP
      }
    }

    if (exclusionLeft !== null && exclusionRight !== null) {
      const leftWidth = Math.max(0, exclusionLeft - contentLeft)
      const rightWidth = Math.max(0, contentRight - exclusionRight)

      if (leftWidth >= MIN_GUTTER) {
        const left = layoutNextLine(prepared, cursor, leftWidth)
        if (!left) break
        lines.push({ text: left.text, x: contentLeft, y, width: left.width })
        cursor = left.end
      }

      if (rightWidth >= MIN_GUTTER) {
        const right = layoutNextLine(prepared, cursor, rightWidth)
        if (!right) break
        lines.push({ text: right.text, x: exclusionRight, y, width: right.width })
        cursor = right.end
      }

      if (leftWidth < MIN_GUTTER && rightWidth < MIN_GUTTER) {
        // both gutters too narrow, skip line
      }
    } else {
      const line = layoutNextLine(prepared, cursor, fullWidth)
      if (!line) break
      lines.push({ text: line.text, x: contentLeft, y, width: line.width })
      cursor = line.end
    }

    y += lineHeight
    lineCount++
  }

  return { lines, totalHeight: y }
}
