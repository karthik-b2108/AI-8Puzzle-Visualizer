import { describe, expect, it } from 'vitest'
import type { SearchConfig, SearchSnapshot } from '../../contract/types'
import { DEFAULT_GOAL } from '../../contract/defaults'
import { createSearch } from '../dfs'
import { runToEnd } from '../runToEnd'

function stepToEnd(config: SearchConfig): SearchSnapshot {
  const search = createSearch(config)
  let snapshot = search.getSnapshot()
  let guard = 0
  while (snapshot.result === null && guard < 1_000_000) {
    snapshot = search.step()
    guard += 1
  }
  return snapshot
}

function counters(snapshot: SearchSnapshot) {
  return {
    outcome: snapshot.result?.outcome ?? null,
    moves: snapshot.result?.moves ?? null,
    path: snapshot.result?.path ?? null,
    generated: snapshot.metrics.generated,
    explored: snapshot.metrics.explored,
    maxDepth: snapshot.metrics.maxDepth,
    nodes: Object.keys(snapshot.nodes).length,
    stack: snapshot.stack,
    visited: snapshot.visited,
    currentId: snapshot.currentId,
    parentOfCurrentId: snapshot.parentOfCurrentId,
    resultGenerated: snapshot.result?.metrics.generated ?? null,
    resultExplored: snapshot.result?.metrics.explored ?? null,
  }
}

describe('runToEnd helper', () => {
  const configs: Array<[string, SearchConfig]> = [
    ['found', { start: 123_745_896, goal: DEFAULT_GOAL, depthLimit: 6 }],
    ['not found', { start: 724_596_831, goal: DEFAULT_GOAL, depthLimit: 3 }],
    ['zero moves', { start: DEFAULT_GOAL, goal: DEFAULT_GOAL, depthLimit: 6 }],
  ]

  it.each(configs)('agrees with repeated step for the %s case', (_name, config) => {
    const headless = runToEnd(config)
    const stepped = stepToEnd(config)

    expect(counters(headless)).toEqual(counters(stepped))
    expect(headless.result?.metrics.generated).toBe(headless.metrics.generated)
    expect(headless.result?.metrics.explored).toBe(headless.metrics.explored)
  })

  it('returns a non-negative elapsed time', () => {
    const snapshot = runToEnd({ start: 123_745_896, goal: DEFAULT_GOAL, depthLimit: 6 })
    expect(snapshot.metrics.elapsedMs).toBeGreaterThanOrEqual(0)
    expect(snapshot.metrics.elapsedMs).toBeGreaterThanOrEqual(0)
    expect(Number.isFinite(snapshot.metrics.elapsedMs)).toBe(true)
  })

  it('has no undo or redo history after a headless run', () => {
    const snapshot = runToEnd({ start: 123_745_896, goal: DEFAULT_GOAL, depthLimit: 6 })
    expect(snapshot.canUndo).toBe(false)
    expect(snapshot.canRedo).toBe(false)
  })
})
