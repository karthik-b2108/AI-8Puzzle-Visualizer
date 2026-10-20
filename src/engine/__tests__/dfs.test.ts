import { describe, expect, it } from 'vitest'
import type { SearchConfig, SearchSnapshot } from '../../contract/types'
import { DEFAULT_DEPTH_LIMIT, DEFAULT_GOAL, DEFAULT_START } from '../../contract/defaults'
import foundFixture from '../../contract/fixtures/found.json'
import { encode } from '../codec'
import { createSearch, redo, step, undo, type SearchController } from '../dfs'
import { createMetrics } from '../metrics'

const DEFAULT_CONFIG: SearchConfig = {
  start: DEFAULT_START,
  goal: DEFAULT_GOAL,
  depthLimit: DEFAULT_DEPTH_LIMIT,
}

/** Everything except the transient capability flags, which legitimately change on undo. */
function engineState(snapshot: SearchSnapshot) {
  return {
    config: snapshot.config,
    nodes: snapshot.nodes,
    stack: snapshot.stack,
    visited: snapshot.visited,
    currentId: snapshot.currentId,
    parentOfCurrentId: snapshot.parentOfCurrentId,
    metrics: snapshot.metrics,
    result: snapshot.result,
  }
}

function runToCompletion(search: SearchController): SearchSnapshot {
  let snapshot = search.getSnapshot()
  let guard = 0
  while (snapshot.result === null && guard < 1_000_000) {
    snapshot = search.step()
    guard += 1
  }
  return snapshot
}

function assertSolutionPath(snapshot: SearchSnapshot): number[] {
  const result = snapshot.result
  expect(result).not.toBeNull()
  expect(result?.outcome).toBe('found')
  const path = result?.path ?? []
  expect(path.length).toBeGreaterThan(0)
  expect(path[0]).toBe(0)
  expect(result?.moves).toBe(path.length - 1)
  const goalNode = snapshot.nodes[path[path.length - 1]]
  expect(goalNode.state).toBe(snapshot.config.goal)
  expect(goalNode.status).toBe('goal')
  path.slice(1).forEach((id, index) => {
    expect(snapshot.nodes[id].parentId).toBe(path[index])
    expect(snapshot.nodes[id].move).not.toBeNull()
  })
  return path
}

describe('initial state', () => {
  it('starts with only the root node on the stack', () => {
    const search = createSearch(DEFAULT_CONFIG)
    const snapshot = search.getSnapshot()

    expect(snapshot.config).toEqual(DEFAULT_CONFIG)
    expect(snapshot.stack).toEqual([0])
    expect(snapshot.visited).toEqual([])
    expect(snapshot.currentId).toBeNull()
    expect(snapshot.parentOfCurrentId).toBeNull()
    expect(snapshot.result).toBeNull()
    expect(snapshot.canUndo).toBe(false)
    expect(snapshot.canRedo).toBe(false)
    expect(snapshot.metrics).toEqual(createMetrics())
    expect(snapshot.nodes[0]).toEqual({
      id: 0,
      state: DEFAULT_START,
      parentId: null,
      depth: 0,
      move: null,
      status: 'frontier',
      children: [],
    })
    expect(search.getLastEvent()).toBeNull()
  })

  it('returns fresh copies that cannot mutate engine state', () => {
    const search = createSearch(DEFAULT_CONFIG)
    const first = search.step()
    const before = search.getSnapshot()

    first.nodes[0].state = 0
    first.nodes[0].children.push(999)
    first.stack.push(999)
    first.visited.push(999)
    first.metrics.generated = 999
    first.config.start = 0

    expect(search.getSnapshot()).toEqual(before)
    expect(search.getSnapshot().nodes[0].state).toBe(DEFAULT_START)
  })
})

describe('step', () => {
  it('pops the root, pushes U, L, R children and leaves U on top', () => {
    const search = createSearch(DEFAULT_CONFIG)
    const snapshot = search.step()

    expect(snapshot.currentId).toBe(0)
    expect(snapshot.parentOfCurrentId).toBeNull()
    expect(snapshot.nodes[0].status).toBe('visited')
    expect(snapshot.visited).toEqual([DEFAULT_START])
    expect(snapshot.metrics.explored).toBe(1)
    expect(snapshot.metrics.generated).toBe(4)
    expect(snapshot.metrics.maxDepth).toBe(1)

    const children = snapshot.nodes[0].children
    expect(children).toHaveLength(3)
    expect(children.map((id) => snapshot.nodes[id].move)).toEqual(['U', 'L', 'R'])
    // Push order is reversed, so the first neighbour is the top of the stack.
    expect(snapshot.stack).toEqual([...children].reverse())

    const event = search.getLastEvent()
    expect(event).toEqual({
      kind: 'step',
      poppedId: 0,
      pushed: 3,
      pruned: 0,
      visited: true,
    })
  })

  it('marks the root as the goal when start equals goal', () => {
    const search = createSearch({ ...DEFAULT_CONFIG, start: DEFAULT_GOAL })
    const snapshot = search.step()

    expect(snapshot.result?.outcome).toBe('found')
    expect(snapshot.result?.moves).toBe(0)
    expect(snapshot.result?.path).toEqual([0])
    expect(snapshot.nodes[0].status).toBe('goal')
  })

  it('counts duplicate pops without exploring them again', () => {
    const search = createSearch({
      start: 724_596_831,
      goal: DEFAULT_GOAL,
      depthLimit: 16,
    })
    let snapshot = search.getSnapshot()
    let sawDuplicate = false

    for (let index = 0; index < 3000 && snapshot.result === null; index += 1) {
      snapshot = search.step()
      const current = snapshot.currentId
      if (current !== null && snapshot.nodes[current].status === 'duplicate') {
        sawDuplicate = true
        break
      }
    }

    expect(sawDuplicate).toBe(true)
    const visitedSet = new Set(snapshot.visited)
    expect(visitedSet.size).toBe(snapshot.visited.length)
    expect(snapshot.visited.length).toBe(snapshot.metrics.explored)
  })

  it('does nothing once a result exists', () => {
    const search = createSearch(DEFAULT_CONFIG)
    const found = runToCompletion(search)
    expect(found.result).not.toBeNull()

    const before = search.getSnapshot()
    const after = search.step()
    expect(after).toEqual(before)
    expect(search.getLastEvent()?.kind).toBe('step')
  })

  it('keeps generated >= explored and maxDepth <= depthLimit after every step', () => {
    const search = createSearch(DEFAULT_CONFIG)
    let snapshot = search.getSnapshot()
    let previousElapsed = snapshot.metrics.elapsedMs

    for (let index = 0; index < 200 && snapshot.result === null; index += 1) {
      snapshot = search.step()
      expect(snapshot.metrics.generated).toBeGreaterThanOrEqual(snapshot.metrics.explored)
      expect(snapshot.metrics.maxDepth).toBeLessThanOrEqual(DEFAULT_CONFIG.depthLimit)
      expect(snapshot.metrics.elapsedMs).toBeGreaterThanOrEqual(previousElapsed)
      previousElapsed = snapshot.metrics.elapsedMs
    }
  })
})

describe('undo and redo', () => {
  it('restores the snapshot from immediately before one step', () => {
    const search = createSearch(DEFAULT_CONFIG)
    const before = search.getSnapshot()
    const after = search.step()

    const undone = undo(search)
    expect(engineState(undone)).toEqual(engineState(before))
    expect(undone.metrics.elapsedMs).toBe(0)
    expect(undone.canUndo).toBe(false)
    expect(undone.canRedo).toBe(true)
    expect(search.getLastEvent()?.kind).toBe('undo')

    const redone = redo(search)
    expect(redone).toEqual(after)
    expect(search.getLastEvent()?.kind).toBe('redo')
  })

  it('does nothing when there is no history', () => {
    const search = createSearch(DEFAULT_CONFIG)
    const initial = search.getSnapshot()

    expect(undo(search)).toEqual(initial)
    expect(redo(search)).toEqual(initial)
    expect(search.getLastEvent()).toBeNull()
  })

  it('survives a 200-step sequence and the same number of undos', () => {
    const search = createSearch({
      start: 724_596_831,
      goal: DEFAULT_GOAL,
      depthLimit: 20,
    })

    const initial = search.getSnapshot()
    const timeline: SearchSnapshot[] = [initial]
    let stepCount = 0

    while (stepCount < 200) {
      const next = search.step()
      stepCount += 1
      timeline.push(next)
      if (next.result !== null) break
    }

    expect(stepCount).toBeGreaterThan(0)
    expect(search.getSnapshot()).toEqual(timeline[stepCount])

    for (let offset = 1; offset <= stepCount; offset += 1) {
      const undone = search.undo()
      expect(engineState(undone)).toEqual(engineState(timeline[stepCount - offset]))
      expect(undone.canUndo).toBe(stepCount - offset > 0)
      expect(undone.canRedo).toBe(true)
    }

    const restored = search.getSnapshot()
    expect(engineState(restored)).toEqual(engineState(initial))
    expect(restored.canUndo).toBe(false)
    expect(restored.canRedo).toBe(true)
    expect(restored.metrics.elapsedMs).toBe(0)

    for (let index = 0; index < stepCount; index += 1) {
      const redone = search.redo()
      expect(engineState(redone)).toEqual(engineState(timeline[index + 1]))
      expect(redone.canUndo).toBe(true)
      expect(redone.canRedo).toBe(index + 1 < stepCount)
    }

    expect(search.getSnapshot()).toEqual(timeline[stepCount])
  })

  it('clears the redo stack when a new step happens', () => {
    const search = createSearch(DEFAULT_CONFIG)
    search.step()
    search.step()
    const undone = search.undo()
    expect(undone.canRedo).toBe(true)

    search.step()
    const snapshot = search.getSnapshot()
    expect(snapshot.canRedo).toBe(false)
    expect(snapshot.canUndo).toBe(true)
  })

  it('undoes and redoes a not-found step', () => {
    const search = createSearch({
      start: 123_456_978,
      goal: DEFAULT_GOAL,
      depthLimit: 1,
    })
    const completed = runToCompletion(search)
    expect(completed.result?.outcome).toBe('not_found')
    expect(completed.stack).toEqual([])

    const undone = search.undo()
    expect(undone.result).toBeNull()
    expect(undone.stack).toEqual([])
    expect(undone.canRedo).toBe(true)

    const redone = search.redo()
    expect(redone.result?.outcome).toBe('not_found')
  })

  it('reset returns to the pristine initial state and clears history', () => {
    const search = createSearch(DEFAULT_CONFIG)
    search.step()
    search.step()
    search.undo()
    expect(search.getSnapshot().canRedo).toBe(true)

    const reset = search.reset()
    const initial = createSearch(DEFAULT_CONFIG).getSnapshot()

    expect(engineState(reset)).toEqual(engineState(initial))
    expect(reset.canUndo).toBe(false)
    expect(reset.canRedo).toBe(false)
    expect(search.getLastEvent()).toEqual({
      kind: 'reset',
      poppedId: null,
      pushed: 0,
      pruned: 0,
      visited: false,
    })
  })
})

describe('solutions', () => {
  it('finds a known one-move solution', () => {
    const config: SearchConfig = {
      start: 123_456_798,
      goal: DEFAULT_GOAL,
      depthLimit: 1,
    }
    const search = createSearch(config)
    const snapshot = runToCompletion(search)

    expect(snapshot.result?.outcome).toBe('found')
    expect(snapshot.result?.moves).toBe(1)
    const path = assertSolutionPath(snapshot)
    expect(path).toHaveLength(2)
    expect(snapshot.nodes[path[1]].move).toBe('R')
    expect(snapshot.nodes[path[1]].state).toBe(DEFAULT_GOAL)
    expect(snapshot.stack).toEqual([])
  })

  it('finds a known two-move solution, ignoring the longer branch', () => {
    const start = 123_456_978
    const config: SearchConfig = { start, goal: DEFAULT_GOAL, depthLimit: 2 }
    const search = createSearch(config)
    const snapshot = runToCompletion(search)

    expect(snapshot.result?.outcome).toBe('found')
    expect(snapshot.result?.moves).toBe(2)
    const path = assertSolutionPath(snapshot)
    expect(path).toHaveLength(3)
    expect(path.map((id) => snapshot.nodes[id].state)).toEqual([
      start,
      123_456_798,
      DEFAULT_GOAL,
    ])
    expect(path.slice(1).map((id) => snapshot.nodes[id].move)).toEqual(['R', 'R'])
  })

  it('reproduces the found fixture for the default configuration', () => {
    const search = createSearch(foundFixture.config)
    const snapshot = runToCompletion(search)

    expect(snapshot.result?.outcome).toBe('found')
    expect(snapshot.result?.path).toEqual(foundFixture.result.path)
    expect(snapshot.result?.moves).toBe(foundFixture.result.moves)
    expect(snapshot.metrics.generated).toBe(foundFixture.metrics.generated)
    expect(snapshot.metrics.explored).toBe(foundFixture.metrics.explored)
    expect(snapshot.metrics.maxDepth).toBe(foundFixture.metrics.maxDepth)
    expect(snapshot.stack).toEqual(foundFixture.stack)
    assertSolutionPath(snapshot)
  })

  it('reports not_found for an unsolvable pair', () => {
    const search = createSearch({
      start: DEFAULT_GOAL,
      goal: encode([2, 1, 3, 4, 5, 6, 7, 8, 9]),
      depthLimit: 6,
    })
    const snapshot = runToCompletion(search)

    expect(snapshot.result?.outcome).toBe('not_found')
    expect(snapshot.result?.moves).toBeNull()
    expect(snapshot.result?.path).toBeNull()
    expect(snapshot.stack).toEqual([])
  })

  it('reports not_found when the depth limit cuts off a solvable pair', () => {
    const search = createSearch({
      start: 123_456_978,
      goal: DEFAULT_GOAL,
      depthLimit: 1,
    })
    const snapshot = runToCompletion(search)

    expect(snapshot.result?.outcome).toBe('not_found')
    expect(snapshot.result?.moves).toBeNull()
    expect(snapshot.result?.path).toBeNull()
    expect(snapshot.stack).toEqual([])
    expect(snapshot.metrics.maxDepth).toBeLessThanOrEqual(1)
  })

  it('reports a zero-move solution when the root is the goal', () => {
    const search = createSearch({ ...DEFAULT_CONFIG, start: DEFAULT_GOAL })
    const snapshot = runToCompletion(search)
    assertSolutionPath(snapshot)
    expect(snapshot.result?.moves).toBe(0)
  })
})

describe('exports', () => {
  it('exposes functional wrappers around the controller', () => {
    const search = createSearch(DEFAULT_CONFIG)
    expect(step(search)).toEqual(search.getSnapshot())
    expect(undo(search)).toEqual(search.getSnapshot())
    expect(redo(search)).toEqual(search.getSnapshot())
  })

  it('returns copies from getLastEvent', () => {
    const search = createSearch(DEFAULT_CONFIG)
    search.step()
    const event = search.getLastEvent()
    expect(event).not.toBeNull()
    if (event) event.pushed = 999
    expect(search.getLastEvent()?.pushed).toBe(3)
  })
})
