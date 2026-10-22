import { useMemo } from 'react'
import { hierarchy, tree } from 'd3-hierarchy'
import type { Edge, Node } from '@xyflow/react'
import type { Move, SearchNode, SearchSnapshot, Status } from '../contract/types'
import { useTreeViewStore } from '../store/useTreeViewStore'

/** Rendered node box. Must match StateNode.module.css. */
export const NODE_WIDTH = 66
export const NODE_HEIGHT = 66

/** d3 tidy-tree spacing: horizontal between siblings, vertical between depths. */
const NODE_SIZE: [number, number] = [100, 96]

export interface StateNodeData extends Record<string, unknown> {
  node: SearchNode
  isCurrent: boolean
  isHovered: boolean
  isSelected: boolean
  isOnSolutionPath: boolean
  /** Zero-based position along the solution path, or null when not on it. */
  solutionIndex?: number | null
  depth: number
  /** Offset from the parent's layout position; used for the enter animation. */
  enterFrom?: { x: number; y: number }
  reducedMotion?: boolean
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

function buildBaseLayout(snapshot: SearchSnapshot, reducedMotion: boolean): BaseLayout {
  const rootNode = snapshot.nodes[0]
  if (!rootNode) return emptyBase

  const childrenOf = (node: SearchNode): SearchNode[] => {
    const children: SearchNode[] = []
    for (const childId of node.children) {
      const child = snapshot.nodes[childId]
      if (child) children.push(child)
    }
    return children
  }

  const hierarchyRoot = hierarchy<SearchNode>(rootNode, childrenOf)
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
        isCurrent: snapshot.currentId === node.id,
        isHovered: false,
        isSelected: false,
        isOnSolutionPath: solutionNodes.has(node.id),
        solutionIndex: solutionNodeIndex.get(node.id) ?? null,
        depth: node.depth,
        enterFrom: parentPoint
          ? { x: parentPoint.x - point.x, y: parentPoint.y - point.y }
          : { x: 0, y: -12 },
        reducedMotion,
      },
    }
  })

  const edges: Edge<TreeEdgeData>[] = []
  for (const node of Object.values(snapshot.nodes)) {
    if (node.parentId === null || node.parentId === undefined) continue
    if (!snapshot.nodes[node.parentId]) continue
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
    version: `${Object.keys(snapshot.nodes).length}:${snapshot.currentId ?? 'none'}:${
      solutionPath?.length ?? 0
    }`,
  }
}

/** Lay out every generated node with d3's tidy tree. */
export function useTreeLayout(snapshot: SearchSnapshot, reducedMotion = false): TreeLayout {
  const hoveredId = useTreeViewStore((state) => state.hoveredId)
  const selectedId = useTreeViewStore((state) => state.selectedId)

  const base = useMemo(() => buildBaseLayout(snapshot, reducedMotion), [snapshot, reducedMotion])

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
