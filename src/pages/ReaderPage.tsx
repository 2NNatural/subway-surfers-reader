import { useState } from 'react'
import { usePretext } from '../hooks/usePretext'
import { TextCanvas } from '../components/TextCanvas'
import { VideoPlayer } from '../components/VideoPlayer'
import { ReaderControls } from '../components/ReaderControls'

type Props = {
  text: string
  onBack: () => void
}

const BLOB_WIDTH = 300
const BLOB_HEIGHT = 400

export function ReaderPage({ text, onBack }: Props) {
  const [fontSize, setFontSize] = useState(18)
  const lineHeight = Math.round(fontSize * 1.6)

  const prepared = usePretext(text, fontSize)

  if (!prepared) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/40">Loading font...</p>
      </div>
    )
  }

  return (
    <>
      <TextCanvas
        prepared={prepared}
        fontSize={fontSize}
        lineHeight={lineHeight}
        blobWidth={BLOB_WIDTH}
        blobHeight={BLOB_HEIGHT}
      />
      <VideoPlayer width={BLOB_WIDTH} height={BLOB_HEIGHT} />
      <ReaderControls
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        onBack={onBack}
      />
    </>
  )
}
