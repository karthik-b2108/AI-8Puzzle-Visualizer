import { useCallback, useEffect, useRef, useState } from 'react'
import type { SearchSnapshot } from '../contract/types'

export interface ReplayControls {
  replaying: boolean
  /** Board state for the current replay frame, or null when idle. */
  state: number | null
  /** 1-based frame number. */
  frame: number
  total: number
  /** Indices of the tiles that moved into this frame. */
  movedIndices: number[]
  start: () => void
  stop: () => void
}

const FRAME_MS = 620

function digitsOf(state: number): number[] {
  return String(state).padStart(9, '0').split('').map(Number)
}

function changedIndices(previous: number | null, next: number): number[] {
  if (previous === null) return []
  const a = digitsOf(previous)
  const b = digitsOf(next)
  const indices: number[] = []
  a.forEach((digit, index) => {
    if (digit !== b[index]) indices.push(index)
  })
  return indices
}

/** Animates the solution path on a board, one move at a time. */
export function useReplay(
  snapshot: SearchSnapshot,
  options: { reducedMotion?: boolean; frameMs?: number } = {},
): ReplayControls {
  const { reducedMotion = false, frameMs = FRAME_MS } = options
  const [index, setIndex] = useState(-1)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const result = snapshot.result
  const path = result?.outcome === 'found' && result.path ? result.path : []
  const states = path
    .map((id) => snapshot.nodes[id]?.state)
    .filter((state): state is number => typeof state === 'number')

  const clear = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const stop = useCallback(() => {
    clear()
    setIndex(-1)
  }, [clear])

  const advance = useCallback(
    (next: number) => {
      if (next >= states.length - 1) {
        timer.current = setTimeout(() => setIndex(-1), Math.max(400, frameMs * 2))
        return
      }
      timer.current = setTimeout(() => {
        setIndex(next + 1)
        advance(next + 1)
      }, frameMs)
    },
    [frameMs, states.length],
  )

  const start = useCallback(() => {
    clear()
    if (states.length === 0) return
    if (reducedMotion) {
      setIndex(states.length - 1)
      return
    }
    setIndex(0)
    advance(0)
  }, [advance, clear, reducedMotion, states.length])

  // Stop when the configuration changes or the component unmounts.
  useEffect(() => {
    stop()
  }, [snapshot.config.start, snapshot.config.goal, snapshot.config.depthLimit, stop])

  useEffect(() => clear, [clear])

  useEffect(() => {
    if (index >= states.length) stop()
  }, [index, states.length, stop])

  const state = index >= 0 && index < states.length ? states[index] : null
  const movedIndices = state === null ? [] : changedIndices(index > 0 ? states[index - 1] : null, state)

  return {
    replaying: index >= 0,
    state,
    frame: index + 1,
    total: states.length,
    movedIndices,
    start,
    stop,
  }
}
