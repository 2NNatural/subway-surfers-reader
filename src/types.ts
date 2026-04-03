export type AppScreen =
  | { kind: 'landing' }
  | { kind: 'reader'; text: string }

export type ReaderSettings = {
  fontSize: number
  lineHeight: number
}

export type FlowLine = {
  text: string
  x: number
  y: number
  width: number
}

/**
 * Per-row silhouette of the character in display pixels.
 * Arrays indexed by display Y row (0 = top of character).
 * Values are X offsets from the character center.
 */
export type CharSilhouette = {
  leftEdges: Float32Array   // negative offsets from center
  rightEdges: Float32Array  // positive offsets from center
  height: number            // display pixel height
  width: number             // display pixel width (for fallback)
}
