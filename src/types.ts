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
