import { beforeEach, describe, expect, it } from 'vitest'
import type { SearchNode, SearchSnapshot } from '../../contract/types'
import { useTreeViewStore } from '../useTreeViewStore'

function synthetic(currentId: number | null = null): SearchSnapshot {
  const nodes: Record<number, SearchNode> = {
    0: {
      id: 0,
      state: 123456789,
      parentId: null,
      depth: 0,
      move: null,
      status: 'visited',
      children: [1],
    },
    1: {
      id: 1,
      state: 123456798,
      parentId: 0,
      depth: 1,
      move: 'U',
      status: 'visited',
      children: [],
    },
  }
  return {
    config: { start: 123456789, goal: 123456789, depthLimit: 30 },
    nodes,
    stack: [0],
    visited: [],
    currentId,
    parentOfCurrentId: currentId === null ? null : nodes[currentId]?.parentId ?? null,
    metrics: { generated: 2, explored: 0, maxDepth: 1, elapsedMs: 0 },
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

  it('focusNode selects and requests the camera', () => {
    store().focusNode(1, synthetic(1))
    expect(store().selectedId).toBe(1)
    expect(store().cameraTargetId).toBe(1)
  })

  it('ignores a focus request for an unknown node', () => {
    store().focusNode(99, synthetic())
    expect(store().selectedId).toBeNull()
    expect(store().cameraTargetId).toBeNull()
  })

  it('clearCameraTarget only clears the pending target', () => {
    store().focusNode(1, synthetic(1))
    expect(store().cameraTargetId).toBe(1)
    store().clearCameraTarget()
    expect(store().cameraTargetId).toBeNull()
    expect(store().selectedId).toBe(1)
  })

  it('reset restores every field', () => {
    store().setHovered(1)
    store().setSelected(1)
    store().focusNode(1, synthetic(1))

    store().reset()
    const state = store()
    expect(state.hoveredId).toBeNull()
    expect(state.selectedId).toBeNull()
    expect(state.cameraTargetId).toBeNull()
  })
})
