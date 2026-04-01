import type { FlowLine } from '../types'
import { getBlobEdges } from './blobContour'

// We need to check the actual pretext API at runtime.
// The plan uses layoutNextLine(prepared, cursor, maxWidth)
// but the real API may differ. We'll adapt.

interface PreparedTextWithSegments {
  // opaque type from pretext
  [key: string]: unknown
}

interface LayoutCursor {
  segmentIndex: number
  graphemeIndex: number
}

interface LayoutLineResult {
  text: string
  width: number
  start: LayoutCursor
  end: LayoutCursor
}

type LayoutNextLineFn = (
  prepared: PreparedTextWithSegments,
  cursor: LayoutCursor,
  maxWidth: number,
) => LayoutLineResult | null

const GAP = 20 // px gap between text and blob edge
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
): { lines: FlowLine[]; totalHeight: number } {
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
  let y = 0
  const lines: FlowLine[] = []

  // Blob center in document space
  const blobCenterDocY = viewportHeight / 2 + scrollTop
  const blobCenterX = viewportWidth / 2

  const contentLeft = padding
  const contentRight = containerWidth - padding
  const fullWidth = contentRight - contentLeft

  if (fullWidth <= 0) return { lines: [], totalHeight: 0 }

  // Safety limit to prevent infinite loops
  const MAX_LINES = 50000
  let lineCount = 0

  while (lineCount < MAX_LINES) {
    const lineCenterY = y + lineHeight / 2
    const yFromBlobCenter = lineCenterY - blobCenterDocY

    const edges = getBlobEdges(yFromBlobCenter, blobHeight, blobWidth)

    if (edges) {
      const blobLeftEdge = blobCenterX + edges.left - GAP
      const blobRightEdge = blobCenterX + edges.right + GAP
      const leftWidth = Math.max(0, blobLeftEdge - contentLeft)
      const rightWidth = Math.max(0, contentRight - blobRightEdge)

      // Left gutter
      if (leftWidth >= MIN_GUTTER) {
        const left = layoutNextLine(prepared, cursor, leftWidth)
        if (!left) break
        lines.push({ text: left.text, x: contentLeft, y, width: left.width })
        cursor = left.end
      }

      // Right gutter (same Y row)
      if (rightWidth >= MIN_GUTTER) {
        const right = layoutNextLine(prepared, cursor, rightWidth)
        if (!right) break
        lines.push({
          text: right.text,
          x: blobRightEdge,
          y,
          width: right.width,
        })
        cursor = right.end
      }

      // If both gutters are too narrow, skip this line
      if (leftWidth < MIN_GUTTER && rightWidth < MIN_GUTTER) {
        // no text on this line, just advance
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
