import { beforeEach, describe, expect, it } from 'vitest'
import type { SearchNode, SearchSnapshot } from '../../contract/types'
import { useTreeViewStore } from '../useTreeViewStore'

interface SyntheticSpec {
  parents: Array<number | null>
  currentId?: number | null
}

function synthetic({ parents, currentId = null }: SyntheticSpec): SearchSnapshot {
  const nodes: Record<number, SearchNode> = {}
  for (let id = 0; id < parents.length; id += 1) {
    nodes[id] = {
      id,
      state: 123456789,
      parentId: parents[id],
      depth: 0,
      move: null,
      status: 'visited',
      children: [],
    }
  }
  for (let id = 1; id < parents.length; id += 1) {
    const parentId = parents[id]
    if (parentId !== null) nodes[parentId].children.push(id)
  }
  for (let id = 0; id < parents.length; id += 1) {
    let depth = 0
    let cursor = nodes[id].parentId
    while (cursor !== null) {
      depth += 1
      cursor = nodes[cursor].parentId
    }
    nodes[id].depth = depth
  }
  return {
    config: { start: 123456789, goal: 123456789, depthLimit: 30 },
    nodes,
    stack: [0],
    visited: [],
    currentId,
    parentOfCurrentId: currentId === null ? null : nodes[currentId]?.parentId ?? null,
    metrics: { generated: parents.length, explored: 0, maxDepth: 0, elapsedMs: 0 },
    result: null,
    canUndo: false,
    canRedo: false,
  }
}

const store = () => useTreeViewStore.getState()

beforeEach(() => {
  store().reset()
})

describe('useTreeViewStore', () => {
  it('starts with the documented defaults', () => {
    const state = store()
    expect(state.autoCollapse).toBe(true)
    expect(state.collapsed.size).toBe(0)
    expect(state.manual.size).toBe(0)
    expect(state.hoveredId).toBeNull()
    expect(state.selectedId).toBeNull()
    expect(state.cameraTargetId).toBeNull()
  })

  it('tracks hover and selection', () => {
    store().setHovered(7)
    store().setSelected(4)
    expect(store().hoveredId).toBe(7)
    expect(store().selectedId).toBe(4)
    store().setHovered(null)
    store().setSelected(null)
    expect(store().hoveredId).toBeNull()
    expect(store().selectedId).toBeNull()
  })

  it('toggles a node between collapsed and open', () => {
    store().toggleCollapsed(2)
    expect(store().collapsed.has(2)).toBe(true)
    expect(store().manual.get(2)).toBe('closed')

    store().toggleCollapsed(2)
    expect(store().collapsed.has(2)).toBe(false)
    expect(store().manual.get(2)).toBe('open')
  })

  it('never collapses the root', () => {
    store().toggleCollapsed(0)
    store().setManual(0, 'closed')
    expect(store().collapsed.has(0)).toBe(false)
    expect(store().manual.has(0)).toBe(false)
  })

  it('setManual updates both the manual map and the effective set', () => {
    store().setManual(3, 'closed')
    expect(store().manual.get(3)).toBe('closed')
    expect(store().collapsed.has(3)).toBe(true)

    store().setManual(3, 'open')
    expect(store().manual.get(3)).toBe('open')
    expect(store().collapsed.has(3)).toBe(false)
  })

  it('setCollapsed replaces only when the contents change', () => {
    store().setCollapsed(new Set([1, 2]))
    const first = store().collapsed
    store().setCollapsed(new Set([2, 1]))
    expect(store().collapsed).toBe(first)

    store().setCollapsed(new Set([2]))
    expect(store().collapsed).not.toBe(first)
    expect([...store().collapsed]).toEqual([2])
  })

  it('expandAll clears manual overrides and the collapsed set', () => {
    store().setManual(1, 'closed')
    store().setManual(2, 'open')
    store().expandAll()
    expect(store().collapsed.size).toBe(0)
    expect(store().manual.size).toBe(0)
  })

  it('expandAncestors re-opens the whole root path', () => {
    const snapshot = synthetic({ parents: [null, 0, 1, 2, 3], currentId: 3 })
    store().setManual(1, 'closed')
    store().setManual(2, 'closed')
    store().setCollapsed(new Set([1, 2]))

    store().expandAncestors(3, snapshot)
    expect(store().collapsed.has(1)).toBe(false)
    expect(store().collapsed.has(2)).toBe(false)
    expect(store().manual.get(1)).toBe('open')
    expect(store().manual.get(2)).toBe('open')
    // Ancestors of the root path are untouched.
    expect(store().manual.has(3)).toBe(false)
  })

  it('focusNode expands ancestors, selects and requests the camera', () => {
    const snapshot = synthetic({ parents: [null, 0, 1, 2, 3], currentId: 3 })
    store().setManual(2, 'closed')
    store().focusNode(3, snapshot)
    expect(store().selectedId).toBe(3)
    expect(store().cameraTargetId).toBe(3)
    expect(store().manual.get(2)).toBe('open')
    expect(store().collapsed.has(2)).toBe(false)
  })

  it('clearCameraTarget only clears the pending target', () => {
    const snapshot = synthetic({ parents: [null, 0, 1], currentId: 1 })
    store().focusNode(1, snapshot)
    expect(store().cameraTargetId).toBe(1)
    store().clearCameraTarget()
    expect(store().cameraTargetId).toBeNull()
    expect(store().selectedId).toBe(1)
  })

  it('collapseFinished closes deep finished subtrees but not the current path', () => {
    // 0 -> 1 -> 2 -> 3 (current), and 0 -> 4 -> 5 -> 6 -> 7 -> 8 finished.
    const snapshot = synthetic({
      parents: [null, 0, 1, 2, 0, 4, 5, 6, 7],
      currentId: 3,
    })
    store().collapseFinished(snapshot)
    expect(store().collapsed.has(6)).toBe(true)
    expect(store().manual.get(6)).toBe('closed')
    for (const id of [0, 1, 2, 3, 4, 5]) {
      expect(store().collapsed.has(id)).toBe(false)
    }
  })

  it('collapseFinished respects manual open subtrees', () => {
    const snapshot = synthetic({
      parents: [null, 0, 1, 2, 0, 4, 5, 6, 7, 8],
      currentId: 3,
    })
    store().setManual(8, 'open')
    store().collapseFinished(snapshot)
    expect(store().collapsed.has(6)).toBe(false)
  })

  it('turning auto-collapse off drops automatic collapses but keeps manual ones', () => {
    store().setManual(9, 'closed')
    store().setCollapsed(new Set([5, 9]))
    store().setAutoCollapse(false)
    expect(store().autoCollapse).toBe(false)
    expect([...store().collapsed]).toEqual([9])
    expect(store().manual.get(9)).toBe('closed')
  })

  it('expandSubtree reveals the subtree and clears nested overrides', () => {
    const snapshot = synthetic({ parents: [null, 0, 0, 2, 2], currentId: null })
    store().setManual(2, 'closed')
    store().setManual(3, 'closed')
    store().setCollapsed(new Set([2, 3]))

    store().expandSubtree(2, snapshot)
    expect(store().collapsed.has(2)).toBe(false)
    expect(store().collapsed.has(3)).toBe(false)
    expect(store().manual.get(2)).toBe('open')
    expect(store().manual.has(3)).toBe(false)
  })

  it('reset restores every field', () => {
    const snapshot = synthetic({ parents: [null, 0, 1], currentId: 1 })
    store().setHovered(1)
    store().setSelected(1)
    store().setManual(1, 'closed')
    store().setAutoCollapse(false)
    store().focusNode(1, snapshot)

    store().reset()
    const state = store()
    expect(state.autoCollapse).toBe(true)
    expect(state.collapsed.size).toBe(0)
    expect(state.manual.size).toBe(0)
    expect(state.hoveredId).toBeNull()
    expect(state.selectedId).toBeNull()
    expect(state.cameraTargetId).toBeNull()
  })
})
