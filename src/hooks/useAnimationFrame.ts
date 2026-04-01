import { useEffect, useRef } from 'react'

export function useAnimationFrame(callback: (time: number) => void) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    let id: number
    const loop = (time: number) => {
      callbackRef.current(time)
      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [])
}
