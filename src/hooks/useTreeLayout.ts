import { useCallback, useMemo } from 'react'
import { hierarchy, tree } from 'd3-hierarchy'
import type { Edge, Node } from '@xyflow/react'
import type { Move, SearchNode, SearchSnapshot, Status } from '../contract/types'
import type { HiddenCounts, VisibilityResult } from '../components/tree/collapse'
import { useTreeViewStore } from '../store/useTreeViewStore'

/** Rendered node box. Must match StateNode.module.css. */
export const NODE_WIDTH = 156
export const NODE_HEIGHT = 66

/** d3 tidy-tree spacing: horizontal between siblings, vertical between depths. */
const NODE_SIZE: [number, number] = [180, 96]

export interface StateNodeData extends Record<string, unknown> {
  node: SearchNode
  /** Present only when this node is collapsed and hides descendants. */
  hidden?: HiddenCounts
  isCurrent: boolean
  isHovered: boolean
  isSelected: boolean
  isOnSolutionPath: boolean
  /** Zero-based position along the solution path, or null when not on it. */
  solutionIndex?: number | null
  isGoal: boolean
  isCollapsed: boolean
  depth: number
  /** Offset from the parent's layout position; used for the enter animation. */
  enterFrom?: { x: number; y: number }
  reducedMotion?: boolean
  onExpandOne: (id: number) => void
  onExpandSubtree: (id: number) => void
}

export interface TreeEdgeData extends Record<string, unknown> {
  move: Move
  solution: boolean
  /** One-based position along the solution path, or null when not on it. */
  solutionIndex?: number | null
  status: Status
  /** Transient backtrack pulse, set by TreeCanvas. */
  pulse?: boolean
  pulseToken?: number
  pulseDirection?: 'up' | 'down'
  pulseDelay?: number
}

export interface TreeLayout {
  nodes: Node<StateNodeData>[]
  edges: Edge<TreeEdgeData>[]
  /** Changes whenever the laid-out content changes; handy as a render key. */
  version: string
}

interface BaseLayout {
  nodes: Node<StateNodeData>[]
  edges: Edge<TreeEdgeData>[]
  version: string
}

const emptyBase: BaseLayout = { nodes: [], edges: [], version: '0:0:0' }

function buildBaseLayout(
  snapshot: SearchSnapshot,
  visibility: VisibilityResult,
  reducedMotion: boolean,
  onExpandOne: (id: number) => void,
  onExpandSubtree: (id: number) => void,
): BaseLayout {
  const rootNode = snapshot.nodes[0]
  if (!rootNode || visibility.visible.size === 0) return emptyBase

  const visibleChildren = (node: SearchNode): SearchNode[] => {
    const children: SearchNode[] = []
    for (const childId of node.children) {
      if (!visibility.visible.has(childId)) continue
      const child = snapshot.nodes[childId]
      if (child) children.push(child)
    }
    return children
  }

  const hierarchyRoot = hierarchy<SearchNode>(rootNode, visibleChildren)
  const layoutRoot = tree<SearchNode>().nodeSize(NODE_SIZE)(hierarchyRoot)

  const solutionPath = snapshot.result?.path ?? null
  const solutionNodes = new Set<number>(solutionPath ?? [])
  const solutionNodeIndex = new Map<number, number>()
  if (solutionPath) {
    solutionPath.forEach((id, index) => solutionNodeIndex.set(id, index))
  }
  const solutionEdges = new Set<string>()
  const solutionEdgeIndex = new Map<string, number>()
  if (solutionPath) {
    for (let i = 1; i < solutionPath.length; i += 1) {
      const key = `${solutionPath[i - 1]}:${solutionPath[i]}`
      solutionEdges.add(key)
      solutionEdgeIndex.set(key, i)
    }
  }

  const nodes: Node<StateNodeData>[] = layoutRoot.descendants().map((point) => {
    const node = point.data
    const parentPoint = point.parent
    return {
      id: String(node.id),
      type: 'state',
      position: {
        x: point.x - NODE_WIDTH / 2,
        y: point.y,
      },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      draggable: false,
      selectable: false,
      connectable: false,
      data: {
        node,
        hidden: visibility.hidden.get(node.id),
        isCurrent: snapshot.currentId === node.id,
        isHovered: false,
        isSelected: false,
        isOnSolutionPath: solutionNodes.has(node.id),
        solutionIndex: solutionNodeIndex.get(node.id) ?? null,
        isGoal: node.status === 'goal',
        isCollapsed: visibility.collapsed.has(node.id),
        depth: node.depth,
        enterFrom: parentPoint
          ? { x: parentPoint.x - point.x, y: parentPoint.y - point.y }
          : { x: 0, y: -12 },
        reducedMotion,
        onExpandOne,
        onExpandSubtree,
      },
    }
  })

  const edges: Edge<TreeEdgeData>[] = []
  for (const node of Object.values(snapshot.nodes)) {
    if (node.parentId === null || node.parentId === undefined) continue
    if (!visibility.visible.has(node.id) || !visibility.visible.has(node.parentId)) continue
    const key = `${node.parentId}:${node.id}`
    edges.push({
      id: `e-${node.parentId}-${node.id}`,
      source: String(node.parentId),
      target: String(node.id),
      type: 'animated',
      selectable: false,
      data: {
        move: node.move,
        solution: solutionEdges.has(key),
        solutionIndex: solutionEdgeIndex.get(key) ?? null,
        status: node.status,
      },
    })
  }

  return {
    nodes,
    edges,
    version: `${visibility.visible.size}:${visibility.collapsed.size}:${snapshot.currentId ?? 'none'}:${
      solutionPath?.length ?? 0
    }`,
  }
}

/**
 * Lay out only the currently visible nodes with d3's tidy tree. A collapsed
 * node is naturally a leaf because none of its children are visible.
 */
export function useTreeLayout(
  snapshot: SearchSnapshot,
  visibility: VisibilityResult,
  reducedMotion = false,
): TreeLayout {
  const hoveredId = useTreeViewStore((state) => state.hoveredId)
  const selectedId = useTreeViewStore((state) => state.selectedId)
  const setManual = useTreeViewStore((state) => state.setManual)
  const expandSubtree = useTreeViewStore((state) => state.expandSubtree)

  const onExpandOne = useCallback(
    (id: number) => {
      setManual(id, 'open')
    },
    [setManual],
  )

  const onExpandSubtree = useCallback(
    (id: number) => {
      expandSubtree(id, snapshot)
    },
    [expandSubtree, snapshot],
  )

  const base = useMemo(
    () => buildBaseLayout(snapshot, visibility, reducedMotion, onExpandOne, onExpandSubtree),
    [snapshot, visibility, reducedMotion, onExpandOne, onExpandSubtree],
  )

  const nodes = useMemo(() => {
    if (hoveredId === null && selectedId === null) return base.nodes
    return base.nodes.map((node) => {
      const id = Number(node.id)
      const isHovered = hoveredId === id
      const isSelected = selectedId === id
      if (node.data.isHovered === isHovered && node.data.isSelected === isSelected) {
        return node
      }
      return {
        ...node,
        data: { ...node.data, isHovered, isSelected },
      }
    })
  }, [base.nodes, hoveredId, selectedId])

  return useMemo(
    () => ({
      nodes,
      edges: base.edges,
      version: `${base.version}:${hoveredId ?? 'x'}:${selectedId ?? 'x'}`,
    }),
    [nodes, base.edges, base.version, hoveredId, selectedId],
  )
}
