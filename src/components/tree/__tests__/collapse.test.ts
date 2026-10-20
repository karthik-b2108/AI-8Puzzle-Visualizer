import { describe, expect, it } from 'vitest'
import type { Move, SearchNode, SearchSnapshot, Status } from '../../../contract/types'
import largeFixture from '../../../contract/fixtures/large-3000.json'
import notFoundFixture from '../../../contract/fixtures/not-found.json'
import {
  HARD_CAP,
  VISIBLE_CAP,
  computeVisibility,
  findFinishedSubtreeRoots,
  isFinishedSubtree,
} from '../collapse'

const large = largeFixture as unknown as SearchSnapshot
const notFound = notFoundFixture as unknown as SearchSnapshot

const STATUSES: Status[] = ['frontier', 'visited', 'duplicate', 'goal']

function childrenOf(snapshot: SearchSnapshot, id: number): number[] {
  const node = snapshot.nodes[id]
  if (!node) return []
  return node.children.filter((childId) => snapshot.nodes[childId])
}

function descendantsOf(snapshot: SearchSnapshot, id: number): SearchNode[] {
  const result: SearchNode[] = []
  const seen = new Set<number>()
  const stack = [...childrenOf(snapshot, id)]
  while (stack.length > 0) {
    const cursor = stack.pop() as number
    if (seen.has(cursor)) continue
    seen.add(cursor)
    const node = snapshot.nodes[cursor]
    if (!node) continue
    result.push(node)
    stack.push(...childrenOf(snapshot, cursor))
  }
  return result
}

function actualCounts(snapshot: SearchSnapshot, id: number) {
  const descendants = descendantsOf(snapshot, id)
  const byStatus: Record<Status, number> = {
    frontier: 0,
    visited: 0,
    duplicate: 0,
    goal: 0,
  }
  for (const node of descendants) byStatus[node.status] += 1
  return { total: descendants.length, byStatus }
}

function pathOf(snapshot: SearchSnapshot, id: number | null): Set<number> {
  const path = new Set<number>()
  let cursor = id
  while (cursor !== null && cursor !== undefined && snapshot.nodes[cursor]) {
    path.add(cursor)
    cursor = snapshot.nodes[cursor].parentId
  }
  return path
}

function reachableCount(snapshot: SearchSnapshot): number {
  return 1 + descendantsOf(snapshot, 0).length
}

interface SyntheticSpec {
  parents: Array<number | null>
  statuses?: Record<number, Status>
  currentId?: number | null
}

function synthetic({ parents, statuses = {}, currentId = null }: SyntheticSpec): SearchSnapshot {
  const nodes: Record<number, SearchNode> = {}
  for (let id = 0; id < parents.length; id += 1) {
    nodes[id] = {
      id,
      state: 123456789,
      parentId: parents[id],
      depth: 0,
      move: null as Move,
      status: statuses[id] ?? 'visited',
      children: [],
    }
  }
  for (let id = 1; id < parents.length; id += 1) {
    const parentId = parents[id]
    if (parentId !== null && nodes[parentId]) nodes[parentId].children.push(id)
  }
  for (let id = 0; id < parents.length; id += 1) {
    let depth = 0
    let cursor = nodes[id].parentId
    const guard = new Set<number>([id])
    while (cursor !== null && nodes[cursor] && !guard.has(cursor)) {
      guard.add(cursor)
      depth += 1
      cursor = nodes[cursor].parentId
    }
    nodes[id].depth = depth
  }
  const stack = Object.values(nodes)
    .filter((node) => node.status === 'frontier')
    .map((node) => node.id)
  const visited = Object.values(nodes)
    .filter((node) => node.status === 'visited' || node.status === 'goal')
    .map((node) => node.id)
  return {
    config: { start: 123456789, goal: 123456789, depthLimit: 30 },
    nodes,
    stack,
    visited,
    currentId,
    parentOfCurrentId: currentId === null ? null : nodes[currentId]?.parentId ?? null,
    metrics: { generated: parents.length, explored: visited.length, maxDepth: 0, elapsedMs: 0 },
    result: null,
    canUndo: false,
    canRedo: false,
  }
}

/** Remove every node with id >= threshold, as an undo would. */
function shrink(snapshot: SearchSnapshot, threshold: number): SearchSnapshot {
  const nodes: Record<number, SearchNode> = {}
  for (const [key, node] of Object.entries(snapshot.nodes)) {
    const id = Number(key)
    if (id >= threshold) continue
    nodes[id] = {
      ...node,
      children: node.children.filter((childId) => childId < threshold),
    }
  }
  const currentId =
    snapshot.currentId !== null && nodes[snapshot.currentId] ? snapshot.currentId : null
  return {
    ...snapshot,
    nodes,
    stack: snapshot.stack.filter((id) => Boolean(nodes[id])),
    visited: snapshot.visited.filter((id) => Boolean(nodes[id])),
    currentId,
    parentOfCurrentId: currentId === null ? null : nodes[currentId]?.parentId ?? null,
    result: null,
  }
}

describe('computeVisibility on the large fixture', () => {
  it('keeps the visible set under the caps and collapses something', () => {
    const result = computeVisibility(large, new Map(), true)
    expect(result.visible.size).toBeLessThanOrEqual(VISIBLE_CAP)
    expect(result.visible.size).toBeLessThanOrEqual(HARD_CAP)
    expect(result.collapsed.size).toBeGreaterThan(0)
    expect(result.visible.has(0)).toBe(true)
    expect(result.collapsed.has(0)).toBe(false)
  })

  it('never auto-collapses the current path', () => {
    const result = computeVisibility(large, new Map(), true)
    const path = pathOf(large, large.currentId)
    expect(path.size).toBeGreaterThan(1)
    for (const id of path) expect(result.collapsed.has(id)).toBe(false)
    for (const id of path) expect(result.visible.has(id)).toBe(true)
  })

  it('never auto-collapses a subtree that still has a frontier node', () => {
    const result = computeVisibility(large, new Map(), true)
    for (const id of result.collapsed) {
      const descendants = descendantsOf(large, id)
      expect(descendants.some((node) => node.status === 'frontier')).toBe(false)
      expect(descendants.some((node) => node.status === 'duplicate')).toBe(false)
      expect(isFinishedSubtree(large, id)).toBe(true)
    }
  })

  it('reports hidden descendant counts that match the tree exactly', () => {
    const result = computeVisibility(large, new Map(), true)
    for (const id of result.collapsed) {
      const hidden = result.hidden.get(id)
      expect(hidden, `hidden entry for ${id}`).toBeDefined()
      expect(hidden).toEqual(actualCounts(large, id))
      for (const node of descendantsOf(large, id)) {
        expect(result.visible.has(node.id), `descendant ${node.id} of ${id}`).toBe(false)
      }
    }
    // Every hidden id belongs to exactly one collapsed subtree.
    for (const [id, hidden] of result.hidden) {
      expect(hidden.total).toBe(descendantsOf(large, id).length)
      expect(hidden.total).toBeGreaterThan(0)
    }
  })

  it('collapses completed subtrees rather than thousands of individual leaves', () => {
    const result = computeVisibility(large, new Map(), true)
    expect(result.collapsed.size).toBeLessThan(100)
    for (const id of result.collapsed) {
      expect(result.hidden.get(id)?.total ?? 0).toBeGreaterThan(0)
    }
  })
})

describe('manual overrides', () => {
  it('manual open always wins over the automatic rule', () => {
    const base = computeVisibility(large, new Map(), true)
    const autoCollapsed = [...base.collapsed][0]
    expect(autoCollapsed).toBeDefined()
    const manual = new Map<number, 'open' | 'closed'>([[autoCollapsed, 'open']])
    const result = computeVisibility(large, manual, true)
    expect(result.collapsed.has(autoCollapsed)).toBe(false)
    expect(result.visible.has(autoCollapsed)).toBe(true)
    const children = childrenOf(large, autoCollapsed)
    expect(children.length).toBeGreaterThan(0)
    expect(result.visible.has(children[0])).toBe(true)
  })

  it('manual open inside a finished region protects the whole region', () => {
    const base = computeVisibility(large, new Map(), true)
    const autoCollapsed = [...base.collapsed][0]
    const deep = descendantsOf(large, autoCollapsed)[0]
    expect(deep).toBeDefined()
    const manual = new Map<number, 'open' | 'closed'>([[deep.id, 'open']])
    const result = computeVisibility(large, manual, true)
    expect(result.collapsed.has(autoCollapsed)).toBe(false)
    expect(result.visible.has(deep.id)).toBe(true)
  })

  it('manual closed collapses a visible node regardless of automatic rules', () => {
    const base = computeVisibility(large, new Map(), true)
    const target = [...base.visible].find(
      (id) => id !== 0 && (large.nodes[id]?.children.length ?? 0) > 0,
    )
    expect(target).toBeDefined()
    const manual = new Map<number, 'open' | 'closed'>([[target as number, 'closed']])
    const result = computeVisibility(large, manual, true)
    expect(result.collapsed.has(target as number)).toBe(true)
    for (const childId of childrenOf(large, target as number)) {
      expect(result.visible.has(childId)).toBe(false)
    }
  })

  it('does not collapse anything automatically when autoCollapse is off', () => {
    const result = computeVisibility(large, new Map(), false)
    expect(result.collapsed.size).toBe(0)
    expect(result.visible.size).toBe(reachableCount(large))

    const manual = new Map<number, 'open' | 'closed'>([[1, 'closed']])
    const manualResult = computeVisibility(large, manual, false)
    expect([...manualResult.collapsed]).toEqual([1])
  })

  it('ignores an attempt to close the root', () => {
    const manual = new Map<number, 'open' | 'closed'>([[0, 'closed']])
    const result = computeVisibility(large, manual, false)
    expect(result.collapsed.has(0)).toBe(false)
    expect(result.visible.has(0)).toBe(true)
  })
})

describe('finished subtrees and shrinking trees', () => {
  it('isFinishedSubtree follows frontier and duplicate status', () => {
    expect(isFinishedSubtree(notFound, 0)).toBe(true)
    const id = Object.keys(large.nodes)
      .map(Number)
      .find((nodeId) => large.nodes[nodeId].status === 'frontier')
    expect(id).toBeDefined()
    expect(isFinishedSubtree(large, id as number)).toBe(false)
    expect(isFinishedSubtree(large, 999999)).toBe(false)
  })

  it('findFinishedSubtreeRoots returns maximal, protected finished regions', () => {
    const path = pathOf(large, large.currentId)
    const roots = findFinishedSubtreeRoots(large, { minDepth: 3, protectedIds: path })
    expect(roots.length).toBeGreaterThan(0)
    for (const id of roots) {
      expect(large.nodes[id].depth).toBeGreaterThanOrEqual(3)
      expect(path.has(id)).toBe(false)
      expect(isFinishedSubtree(large, id)).toBe(true)
      for (const descendant of descendantsOf(large, id)) {
        expect(path.has(descendant.id)).toBe(false)
      }
    }
  })

  it('keeps hidden counts correct after an undo-like shrink', () => {
    const after = shrink(large, 2600)
    expect(Object.keys(after.nodes).length).toBeLessThan(Object.keys(large.nodes).length)

    for (const autoCollapse of [true, false]) {
      const result = computeVisibility(after, new Map(), autoCollapse)
      if (autoCollapse) expect(result.visible.size).toBeLessThanOrEqual(HARD_CAP)
      for (const id of result.collapsed) {
        expect(after.nodes[id]).toBeDefined()
        expect(result.hidden.get(id)).toEqual(actualCounts(after, id))
        for (const descendant of descendantsOf(after, id)) {
          expect(result.visible.has(descendant.id)).toBe(false)
        }
      }
      const visibleTotal = result.visible.size
      let hiddenTotal = 0
      for (const hidden of result.hidden.values()) hiddenTotal += hidden.total
      expect(visibleTotal + hiddenTotal).toBe(reachableCount(after))
    }
  })

  it('recomputes from scratch when new nodes arrive', () => {
    const before = computeVisibility(large, new Map(), true)
    const grown = shrink(large, 2500)
    const grownAgain = computeVisibility(grown, new Map(), true)
    expect(grownAgain.visible.size).toBeLessThanOrEqual(VISIBLE_CAP)
    // No stale ids from the larger snapshot survive.
    for (const id of grownAgain.visible) expect(grown.nodes[id]).toBeDefined()
    for (const id of grownAgain.collapsed) expect(grown.nodes[id]).toBeDefined()
    expect(before.collapsed.size).toBeGreaterThan(0)
  })
})

describe('synthetic edge cases', () => {
  it('applies the hard cap to shallow finished subtrees', () => {
    const parents: Array<number | null> = [null, 0]
    for (let id = 2; id <= 2001; id += 1) parents.push(1)
    const snapshot = synthetic({ parents })
    const result = computeVisibility(snapshot, new Map(), true)
    expect(result.visible.size).toBeLessThanOrEqual(HARD_CAP)
    expect(result.collapsed.has(1)).toBe(true)
    expect(result.hidden.get(1)?.total).toBe(2000)
    expect(result.visible.size).toBe(2)
  })

  it('protects the root-to-current path and frontier branches', () => {
    // Root -> 1 -> 2 -> 3 -> 4 (current), a finished branch 5 -> 6 -> 7 with
    // 400 leaves, and a frontier leaf 9 hanging off the root. The finished
    // branch must collapse; the path and frontier stay visible.
    const parents: Array<number | null> = [null, 0, 1, 2, 3, 0, 5, 6, 9, 0]
    for (let id = 10; id < 410; id += 1) parents.push(7)
    const statuses: Record<number, Status> = { 4: 'visited', 9: 'frontier' }
    const snapshot = synthetic({ parents, statuses, currentId: 4 })
    const result = computeVisibility(snapshot, new Map(), true)
    expect(result.visible.size).toBeLessThanOrEqual(VISIBLE_CAP)
    expect(result.collapsed.has(7)).toBe(true)
    for (const id of [0, 1, 2, 3, 4]) {
      expect(result.collapsed.has(id)).toBe(false)
      expect(result.visible.has(id)).toBe(true)
    }
    expect(result.visible.has(9)).toBe(true)
    expect(result.collapsed.has(9)).toBe(false)
    for (const id of result.collapsed) {
      expect(descendantsOf(snapshot, id).some((node) => node.status === 'frontier')).toBe(false)
    }
  })

  it('handles an empty tree and a root-only tree', () => {
    const empty: SearchSnapshot = {
      ...synthetic({ parents: [null] }),
      nodes: {},
    }
    const emptyResult = computeVisibility(empty, new Map(), true)
    expect(emptyResult.visible.size).toBe(0)
    expect(emptyResult.collapsed.size).toBe(0)

    const rootOnly = synthetic({ parents: [null] })
    const rootResult = computeVisibility(rootOnly, new Map(), true)
    expect([...rootResult.visible]).toEqual([0])
    expect(rootResult.collapsed.size).toBe(0)
  })

  it('builds status breakdowns for collapsed leaves', () => {
    const parents: Array<number | null> = [null, 0, 1, 1, 1]
    const snapshot = synthetic({
      parents,
      statuses: { 2: 'visited', 3: 'duplicate', 4: 'goal' },
    })
    const manual = new Map<number, 'open' | 'closed'>([[1, 'closed']])
    const result = computeVisibility(snapshot, manual, false)
    expect(result.hidden.get(1)).toEqual({
      total: 3,
      byStatus: { frontier: 0, visited: 1, duplicate: 1, goal: 1 },
    })
    for (const status of STATUSES) {
      expect(result.hidden.get(1)?.byStatus[status]).toBeGreaterThanOrEqual(0)
    }
  })
})
