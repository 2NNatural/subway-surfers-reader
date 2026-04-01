import { useState, useCallback } from 'react'
import { FileUploader } from '../components/FileUploader'
import { TextPaster } from '../components/TextPaster'
import { usePdfExtract } from '../hooks/usePdfExtract'

type Props = {
  onStart: (text: string) => void
}

export function LandingPage({ onStart }: Props) {
  const [pastedText, setPastedText] = useState('')
  const { loading, error, extract } = usePdfExtract()
  const [fileName, setFileName] = useState<string | null>(null)
  const [extractedText, setExtractedText] = useState<string | null>(null)

  const handleFile = useCallback(
    async (file: File) => {
      setFileName(file.name)
      if (file.name.endsWith('.txt')) {
        const text = await file.text()
        setExtractedText(text)
      } else {
        const text = await extract(file)
        if (text) setExtractedText(text)
      }
    },
    [extract],
  )

  const finalText = extractedText || pastedText
  const canStart = finalText.trim().length > 0 && !loading

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold text-white tracking-tight">
            Subway Reader
          </h1>
          <p className="text-white/40 text-sm">
            Upload a document or paste text. Read with Subway Surfers.
          </p>
        </div>

        <FileUploader onFile={handleFile} loading={loading} />

        {fileName && !loading && (
          <p className="text-white/40 text-sm text-center">{fileName} loaded</p>
        )}

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/30 text-xs uppercase tracking-wider">
            or
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <TextPaster value={pastedText} onChange={setPastedText} />

        <button
          onClick={() => canStart && onStart(finalText)}
          disabled={!canStart}
          className={`
            w-full py-3 rounded-xl font-medium text-sm transition-all
            ${
              canStart
                ? 'bg-white text-black hover:bg-white/90 cursor-pointer'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }
          `}
        >
          Start Reading
        </button>
      </div>
    </div>
  )
}
