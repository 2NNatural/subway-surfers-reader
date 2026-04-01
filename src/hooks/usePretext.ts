import { useMemo, useEffect, useState } from 'react'
import { prepareWithSegments, type PreparedTextWithSegments } from '@chenglou/pretext'

export function usePretext(
  text: string | null,
  fontSize: number,
): PreparedTextWithSegments | null {
  const font = `${fontSize}px Inter`
  const [fontReady, setFontReady] = useState(false)

  useEffect(() => {
    document.fonts.load(font).then(() => setFontReady(true))
  }, [font])

  return useMemo(() => {
    if (!text || !fontReady) return null
    return prepareWithSegments(text, font)
  }, [text, font, fontReady])
}
