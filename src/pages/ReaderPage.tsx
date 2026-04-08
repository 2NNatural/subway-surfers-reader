import { useState, useRef } from 'react'
import { usePretext } from '../hooks/usePretext'
import { TextCanvas } from '../components/TextCanvas'
import { VideoPlayer } from '../components/VideoPlayer'
import { TrainCanvas } from '../components/TrainCanvas'
import { ReaderControls } from '../components/ReaderControls'
import type { CharSilhouette } from '../types'
import type { TrainRect } from '../lib/trainObstacles'

type Props = {
  text: string
  onBack: () => void
}

const BLOB_WIDTH = 160
const BLOB_HEIGHT = 220

export function ReaderPage({ text, onBack }: Props) {
  const [fontSize, setFontSize] = useState(18)
  const lineHeight = Math.round(fontSize * 1.6)
  const silhouetteRef = useRef<CharSilhouette | null>(null)
  const trainRectsRef = useRef<TrainRect[]>([])

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
        silhouetteRef={silhouetteRef}
        trainRectsRef={trainRectsRef}
      />
      <VideoPlayer
        width={BLOB_WIDTH}
        height={BLOB_HEIGHT}
        silhouetteRef={silhouetteRef}
      />
      <TrainCanvas trainRectsRef={trainRectsRef} />
      <ReaderControls
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        onBack={onBack}
      />
    </>
  )
}
