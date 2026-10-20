import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { SearchSnapshot } from '../../contract/types'
import largeFixture from '../../contract/fixtures/large-3000.json'
import foundFixture from '../../contract/fixtures/found.json'
import { computeVisibility } from '../../components/tree/collapse'
import { useTreeLayout } from '../useTreeLayout'
import { useTreeViewStore } from '../../store/useTreeViewStore'

const large = largeFixture as unknown as SearchSnapshot
const found = foundFixture as unknown as SearchSnapshot

beforeEach(() => {
  useTreeViewStore.getState().reset()
})

describe('useTreeLayout', () => {
  it('renders exactly the visible nodes and connects only visible ones', () => {
    const visibility = computeVisibility(large, new Map(), true)
    const { result } = renderHook(() => useTreeLayout(large, visibility))

    expect(result.current.nodes.length).toBe(visibility.visible.size)
    expect(result.current.edges.length).toBe(visibility.visible.size - 1)

    const rendered = new Set(result.current.nodes.map((node) => Number(node.id)))
    expect(rendered).toEqual(new Set(visibility.visible))
    for (const edge of result.current.edges) {
      expect(rendered.has(Number(edge.source))).toBe(true)
      expect(rendered.has(Number(edge.target))).toBe(true)
    }
  })

  it('treats a collapsed node as a leaf', () => {
    const visibility = computeVisibility(large, new Map(), true)
    const { result } = renderHook(() => useTreeLayout(large, visibility))

    expect(visibility.collapsed.size).toBeGreaterThan(0)
    for (const id of visibility.collapsed) {
      expect(result.current.edges.some((edge) => Number(edge.source) === id)).toBe(false)
      const node = result.current.nodes.find((candidate) => Number(candidate.id) === id)
      expect(node?.data.isCollapsed).toBe(true)
      expect(node?.data.hidden).toEqual(visibility.hidden.get(id))
    }
  })

  it('lays out the root at the top centre with finite positions', () => {
    const visibility = computeVisibility(large, new Map(), true)
    const { result } = renderHook(() => useTreeLayout(large, visibility))
    const root = result.current.nodes.find((node) => node.id === '0')
    expect(root).toBeDefined()
    expect(root?.position.y).toBe(0)
    expect(root?.position.x).toBe(-78)
    for (const node of result.current.nodes) {
      expect(Number.isFinite(node.position.x)).toBe(true)
      expect(Number.isFinite(node.position.y)).toBe(true)
    }
  })

  it('marks edges along the solution path', () => {
    const visibility = computeVisibility(found, new Map(), false)
    const { result } = renderHook(() => useTreeLayout(found, visibility))
    const path = found.result?.path ?? []
    expect(path.length).toBeGreaterThan(1)
    const solutionEdges = result.current.edges.filter((edge) => edge.data?.solution)
    expect(solutionEdges.length).toBe(path.length - 1)
    for (let i = 1; i < path.length; i += 1) {
      expect(
        result.current.edges.some(
          (edge) =>
            Number(edge.source) === path[i - 1] &&
            Number(edge.target) === path[i] &&
            edge.data?.solution === true,
        ),
      ).toBe(true)
    }
    for (const id of path) {
      const node = result.current.nodes.find((candidate) => Number(candidate.id) === id)
      expect(node?.data.isOnSolutionPath).toBe(true)
    }
  })

  it('decorates nodes from the hover and selection store', () => {
    const visibility = computeVisibility(large, new Map(), true)
    const target = [...visibility.visible].find((id) => id !== 0) as number
    const { result } = renderHook(() => useTreeLayout(large, visibility))

    act(() => {
      useTreeViewStore.getState().setHovered(target)
      useTreeViewStore.getState().setSelected(target)
    })
    const node = result.current.nodes.find((candidate) => Number(candidate.id) === target)
    expect(node?.data.isHovered).toBe(true)
    expect(node?.data.isSelected).toBe(true)
    expect(result.current.nodes.filter((candidate) => candidate.data.isHovered).length).toBe(1)
  })
})
