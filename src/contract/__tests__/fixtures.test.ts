import { describe, expect, it } from 'vitest'
import type { SearchSnapshot } from '../types'
import initial from '../fixtures/initial.json'
import midRun from '../fixtures/mid-run.json'
import found from '../fixtures/found.json'
import notFound from '../fixtures/not-found.json'
import large from '../fixtures/large-3000.json'

const fixtures: Array<[string, SearchSnapshot]> = [
  ['initial', initial as unknown as SearchSnapshot],
  ['mid-run', midRun as unknown as SearchSnapshot],
  ['found', found as unknown as SearchSnapshot],
  ['not-found', notFound as unknown as SearchSnapshot],
  ['large-3000', large as unknown as SearchSnapshot],
]

const digitsOf = (state: number) => String(state).padStart(9, '0').split('').map(Number)

const inversions = (state: number) => {
  const tiles = digitsOf(state).filter((digit) => digit !== 9)
  let count = 0
  for (let i = 0; i < tiles.length; i += 1) {
    for (let j = i + 1; j < tiles.length; j += 1) {
      if (tiles[i] > tiles[j]) count += 1
    }
  }
  return count
}

describe('contract fixtures', () => {
  it.each(fixtures)('%s fixture matches the snapshot shape', (_name, snapshot) => {
    expect(snapshot.config.start).toBeTypeOf('number')
    expect(snapshot.config.goal).toBeTypeOf('number')
    expect(snapshot.config.depthLimit).toBeGreaterThan(0)

    const nodeIds = Object.keys(snapshot.nodes)
    expect(nodeIds.length).toBeGreaterThan(0)
    expect(snapshot.nodes[0]).toBeDefined()
    expect(snapshot.nodes[0].parentId).toBeNull()

    for (const id of snapshot.stack) {
      expect(snapshot.nodes[id], `stack id ${id}`).toBeDefined()
    }
    for (const node of Object.values(snapshot.nodes)) {
      if (node.parentId !== null) {
        expect(snapshot.nodes[node.parentId], `parent of ${node.id}`).toBeDefined()
        expect(node.depth).toBe(snapshot.nodes[node.parentId].depth + 1)
      }
      for (const childId of node.children) {
        expect(snapshot.nodes[childId]).toBeDefined()
      }
    }

    expect(snapshot.metrics.generated).toBeGreaterThanOrEqual(snapshot.metrics.explored)
    expect(snapshot.metrics.elapsedMs).toBeGreaterThanOrEqual(0)
  })

  it.each(fixtures)('%s fixture uses 9 for the blank and a solvable pair', (_name, snapshot) => {
    expect(digitsOf(snapshot.config.start)).toContain(9)
    expect(digitsOf(snapshot.config.goal)).toContain(9)
    expect(inversions(snapshot.config.start) % 2).toBe(inversions(snapshot.config.goal) % 2)
  })

  it('initial fixture is untouched', () => {
    const snapshot = initial as unknown as SearchSnapshot
    expect(snapshot.stack).toEqual([0])
    expect(snapshot.visited).toEqual([])
    expect(snapshot.currentId).toBeNull()
    expect(snapshot.result).toBeNull()
    expect(snapshot.canUndo).toBe(false)
    expect(snapshot.canRedo).toBe(false)
  })

  it('found fixture has a consistent solution path', () => {
    const snapshot = found as unknown as SearchSnapshot
    expect(snapshot.result?.outcome).toBe('found')
    const path = snapshot.result?.path ?? []
    expect(path[0]).toBe(0)
    expect(snapshot.result?.moves).toBe(path.length - 1)
    const goalNode = snapshot.nodes[path[path.length - 1]]
    expect(goalNode.state).toBe(snapshot.config.goal)
    expect(goalNode.status).toBe('goal')
    path.slice(1).forEach((id, index) => {
      expect(snapshot.nodes[id].parentId).toBe(path[index])
    })
  })

  it('not-found fixture is a depth-limit miss', () => {
    const snapshot = notFound as unknown as SearchSnapshot
    expect(snapshot.result?.outcome).toBe('not_found')
    expect(snapshot.result?.moves).toBeNull()
    expect(snapshot.result?.path).toBeNull()
    expect(snapshot.stack).toEqual([])
    expect(Object.keys(snapshot.nodes).length).toBeGreaterThan(10)
  })

  it('large fixture holds at least 3,000 nodes', () => {
    const snapshot = large as unknown as SearchSnapshot
    expect(Object.keys(snapshot.nodes).length).toBeGreaterThanOrEqual(3000)
    expect(snapshot.result).toBeNull()
  })
})
