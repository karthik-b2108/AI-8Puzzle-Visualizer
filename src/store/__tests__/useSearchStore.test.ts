import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSearch } from '../../engine/dfs'
import { DEFAULT_GOAL, DEFAULT_START } from '../../contract/defaults'
import { useSearchStore } from '../useSearchStore'

const HARD_START = 724596831

function resetStore(start = DEFAULT_START, depthLimit = 6) {
  useSearchStore.getState().configure({ start, goal: DEFAULT_GOAL, depthLimit })
  useSearchStore.getState().setSpeed(1)
}

beforeEach(() => {
  vi.useFakeTimers()
  resetStore()
})

afterEach(() => {
  useSearchStore.getState().setAutoplay(false)
  vi.useRealTimers()
})

describe('useSearchStore', () => {
  it('steps, undoes and redoes in agreement with the engine', () => {
    const engine = createSearch({ start: DEFAULT_START, goal: DEFAULT_GOAL, depthLimit: 6 })
    const before = engine.getSnapshot()

    useSearchStore.getState().step()
    const afterStep = useSearchStore.getState().snapshot
    expect(afterStep).toEqual(engine.step())
    expect(afterStep.canUndo).toBe(true)

    useSearchStore.getState().undo()
    // Undo restores the search state exactly; `canRedo` is expected to flip on.
    expect({ ...useSearchStore.getState().snapshot, canRedo: false }).toEqual(before)
    expect(useSearchStore.getState().snapshot.canRedo).toBe(true)
    expect(useSearchStore.getState().lastAction?.kind).toBe('undo')

    useSearchStore.getState().redo()
    expect(useSearchStore.getState().snapshot).toEqual(afterStep)
  })

  it('configures and resets', () => {
    useSearchStore.getState().step()
    useSearchStore.getState().step()
    useSearchStore.getState().configure({ start: HARD_START, goal: DEFAULT_GOAL, depthLimit: 4 })
    const snapshot = useSearchStore.getState().snapshot
    expect(snapshot.config.start).toBe(HARD_START)
    expect(snapshot.stack).toHaveLength(1)
    expect(snapshot.visited).toHaveLength(0)
    expect(snapshot.canUndo).toBe(false)

    useSearchStore.getState().step()
    useSearchStore.getState().reset()
    expect(useSearchStore.getState().snapshot.visited).toHaveLength(0)
    expect(useSearchStore.getState().snapshot.metrics.explored).toBe(0)
  })

  it('runs to the end and finds the default solution', () => {
    useSearchStore.getState().runToEnd()
    const snapshot = useSearchStore.getState().snapshot
    expect(snapshot.result?.outcome).toBe('found')
    expect(snapshot.result?.moves).toBeGreaterThan(0)
    expect(snapshot.canUndo).toBe(false)
  })

  it('autoplay advances on the timer and stops on request', () => {
    resetStore(HARD_START, 12)
    useSearchStore.getState().setSpeed(5)
    useSearchStore.getState().setAutoplay(true)
    expect(useSearchStore.getState().autoplay.running).toBe(true)

    vi.advanceTimersByTime(700)
    const stepped = useSearchStore.getState().snapshot.metrics.explored
    expect(stepped).toBeGreaterThan(0)

    useSearchStore.getState().setAutoplay(false)
    expect(useSearchStore.getState().autoplay.running).toBe(false)
    vi.advanceTimersByTime(5000)
    expect(useSearchStore.getState().snapshot.metrics.explored).toBe(stepped)
  })

  it('autoplay stops automatically when the search finishes', () => {
    resetStore(DEFAULT_START, 6)
    useSearchStore.getState().setSpeed(5)
    useSearchStore.getState().setAutoplay(true)
    vi.advanceTimersByTime(120_000)
    expect(useSearchStore.getState().snapshot.result).not.toBeNull()
    expect(useSearchStore.getState().autoplay.running).toBe(false)
  })

  it('records narration for the last step', () => {
    useSearchStore.getState().step()
    const action = useSearchStore.getState().lastAction
    expect(action?.kind).toBe('step')
    expect(action?.poppedId).toBe(0)
    expect(action?.visited).toBe(true)
    expect(action?.pushed).toBeGreaterThanOrEqual(0)
  })
})
