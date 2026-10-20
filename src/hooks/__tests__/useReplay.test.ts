import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SearchSnapshot } from '../../contract/types'
import found from '../../contract/fixtures/found.json'
import { useReplay } from '../useReplay'

const snapshot = found as unknown as SearchSnapshot

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useReplay', () => {
  it('walks the solution path frame by frame', () => {
    const { result } = renderHook(() => useReplay(snapshot, { frameMs: 100 }))
    expect(result.current.replaying).toBe(false)

    act(() => result.current.start())
    expect(result.current.replaying).toBe(true)
    expect(result.current.frame).toBe(1)
    expect(result.current.state).toBe(snapshot.nodes[0].state)

    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(result.current.frame).toBe(2)
    expect(result.current.movedIndices.length).toBeGreaterThan(0)
  })

  it('jumps to the final frame with reduced motion', () => {
    const { result } = renderHook(() => useReplay(snapshot, { reducedMotion: true }))
    act(() => result.current.start())
    expect(result.current.frame).toBe(result.current.total)
    expect(result.current.state).toBe(snapshot.config.goal)
  })

  it('stops on demand', () => {
    const { result } = renderHook(() => useReplay(snapshot))
    act(() => result.current.start())
    act(() => result.current.stop())
    expect(result.current.replaying).toBe(false)
    expect(result.current.state).toBeNull()
  })

  it('does nothing when there is no result', () => {
    const empty: SearchSnapshot = { ...snapshot, result: null }
    const { result } = renderHook(() => useReplay(empty))
    act(() => result.current.start())
    expect(result.current.replaying).toBe(false)
    expect(result.current.total).toBe(0)
  })
})
