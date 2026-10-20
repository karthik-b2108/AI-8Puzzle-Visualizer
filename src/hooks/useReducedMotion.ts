import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/** Tracks the OS reduced-motion preference (animated components read this). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return window.matchMedia(QUERY).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const query = window.matchMedia(QUERY)
    const handler = () => setReduced(query.matches)
    handler()
    query.addEventListener?.('change', handler)
    return () => query.removeEventListener?.('change', handler)
  }, [])

  return reduced
}
