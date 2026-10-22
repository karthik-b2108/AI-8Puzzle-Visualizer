import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { SearchSnapshot } from '../../contract/types'
import largeFixture from '../../contract/fixtures/large-3000.json'
import foundFixture from '../../contract/fixtures/found.json'
import { useTreeLayout } from '../useTreeLayout'
import { useTreeViewStore } from '../../store/useTreeViewStore'

const large = largeFixture as unknown as SearchSnapshot
const found = foundFixture as unknown as SearchSnapshot

beforeEach(() => {
  useTreeViewStore.getState().reset()
})

describe('useTreeLayout', () => {
  it('renders every generated node and connects its tree', () => {
    const { result } = renderHook(() => useTreeLayout(large))

    expect(result.current.nodes.length).toBe(Object.keys(large.nodes).length)
    expect(result.current.edges.length).toBe(result.current.nodes.length - 1)

    const rendered = new Set(result.current.nodes.map((node) => Number(node.id)))
    expect(rendered.size).toBe(result.current.nodes.length)
    for (const edge of result.current.edges) {
      expect(rendered.has(Number(edge.source))).toBe(true)
      expect(rendered.has(Number(edge.target))).toBe(true)
    }
  })

  it('lays out the root at the top centre with finite positions', () => {
    const { result } = renderHook(() => useTreeLayout(large))
    const root = result.current.nodes.find((node) => node.id === '0')
    expect(root).toBeDefined()
    expect(root?.position.y).toBe(0)
    expect(root?.position.x).toBe(-33)
    for (const node of result.current.nodes) {
      expect(Number.isFinite(node.position.x)).toBe(true)
      expect(Number.isFinite(node.position.y)).toBe(true)
    }
  })

  it('marks edges along the solution path', () => {
    const { result } = renderHook(() => useTreeLayout(found))
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
    for (let i = 1; i < path.length; i += 1) {
      const edge = result.current.edges.find(
        (candidate) =>
          Number(candidate.source) === path[i - 1] && Number(candidate.target) === path[i],
      )
      expect(edge?.data?.solutionIndex).toBe(i)
    }
    const goalNode = result.current.nodes.find((candidate) => Number(candidate.id) === path.at(-1))
    expect(goalNode?.data.solutionIndex).toBe(path.length - 1)
  })

  it('records the parent offset for the enter animation and honours reduced motion', () => {
    const { result } = renderHook(() => useTreeLayout(found, true))
    const root = result.current.nodes.find((node) => node.id === '0')
    const child = result.current.nodes.find((node) => Number(node.id) !== 0)

    expect(root?.data.enterFrom).toEqual({ x: 0, y: -12 })
    expect(root?.data.reducedMotion).toBe(true)
    expect(child?.data.enterFrom).toBeDefined()
    expect(child?.data.enterFrom?.y).toBeLessThan(0)
  })

  it('decorates nodes from the hover and selection store', () => {
    const target = Object.keys(large.nodes).map(Number).find((id) => id !== 0) as number
    const { result } = renderHook(() => useTreeLayout(large))

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
