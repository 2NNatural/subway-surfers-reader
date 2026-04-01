/**
 * Superellipse-based blob contour for text exclusion zones.
 * For any Y offset from center, returns the left/right edges of the blob.
 */

export function getBlobEdges(
  yFromCenter: number,
  blobHeight: number,
  blobWidth: number,
  n: number = 3,
): { left: number; right: number } | null {
  const t = yFromCenter / (blobHeight / 2)
  if (Math.abs(t) > 1) return null

  const halfWidth =
    (blobWidth / 2) * Math.pow(1 - Math.pow(Math.abs(t), n), 1 / n)

  return { left: -halfWidth, right: halfWidth }
}

/**
 * Generate a CSS polygon() clip-path string from the superellipse.
 */
export function blobToClipPath(
  width: number,
  height: number,
  n: number = 3,
  samples: number = 60,
): string {
  const points: string[] = []

  // Right edge, top to bottom
  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * 2 - 1
    const edges = getBlobEdges((t * height) / 2, height, width, n)
    if (!edges) continue
    const px = 50 + (edges.right / width) * 100
    const py = 50 + t * 50
    points.push(`${px.toFixed(2)}% ${py.toFixed(2)}%`)
  }

  // Left edge, bottom to top
  for (let i = samples; i >= 0; i--) {
    const t = (i / samples) * 2 - 1
    const edges = getBlobEdges((t * height) / 2, height, width, n)
    if (!edges) continue
    const px = 50 + (edges.left / width) * 100
    const py = 50 + t * 50
    points.push(`${px.toFixed(2)}% ${py.toFixed(2)}%`)
  }

  return `polygon(${points.join(', ')})`
}
