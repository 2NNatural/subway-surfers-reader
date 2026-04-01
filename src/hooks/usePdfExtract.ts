import { useState, useCallback } from 'react'
import { extractTextFromPdf } from '../lib/pdfExtractor'

export function usePdfExtract() {
  const [text, setText] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const extract = useCallback(async (file: File) => {
    setLoading(true)
    setError(null)
    try {
      const result = await extractTextFromPdf(file)
      setText(result)
      setLoading(false)
      return result
    } catch (e) {
      setError(String(e))
      setLoading(false)
      return null
    }
  }, [])

  return { text, loading, error, extract }
}
