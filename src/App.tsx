import { useState } from 'react'
import { LandingPage } from './pages/LandingPage'
import { ReaderPage } from './pages/ReaderPage'
import type { AppScreen } from './types'

function App() {
  const [screen, setScreen] = useState<AppScreen>({ kind: 'landing' })

  if (screen.kind === 'reader') {
    return (
      <ReaderPage
        text={screen.text}
        onBack={() => setScreen({ kind: 'landing' })}
      />
    )
  }

  return (
    <LandingPage
      onStart={(text) => setScreen({ kind: 'reader', text })}
    />
  )
}

export default App
