import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useViewport,
} from '@xyflow/react'
import type {
  Edge,
  EdgeTypes,
  Node,
  NodeMouseHandler,
  NodeTypes,
  ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { SearchSnapshot, Status } from '../../contract/types'
import type { TreeCanvasProps } from '../../contract/ui'
import { useTreeLayout, NODE_HEIGHT, NODE_WIDTH } from '../../hooks/useTreeLayout'
import type { StateNodeData, TreeEdgeData } from '../../hooks/useTreeLayout'
import { useTreeViewStore } from '../../store/useTreeViewStore'
import { computeVisibility } from './collapse'
import { AnimatedEdge } from './AnimatedEdge'
import { Legend } from './Legend'
import { StateNode } from './StateNode'
import { statusColor } from './status'
import { TreeToolbar } from './TreeToolbar'
import styles from './TreeCanvas.module.css'

const nodeTypes: NodeTypes = { state: StateNode }
const edgeTypes: EdgeTypes = { animated: AnimatedEdge }

function stateColor(node: Node): string {
  const data = node.data as StateNodeData | undefined
  return data ? statusColor(data.node.status) : 'var(--border-strong)'
}

interface PulseEdge {
  id: string
  direction: 'up' | 'down'
  delay: number
}

interface EdgePulse {
  token: number
  edges: Map<string, PulseEdge>
}

interface Ghost {
  key: string
  id: number
  state: number
  status: Status
  x: number
  y: number
  delay: number
}

/** Parent chain starting at `id` and ending at the root. */
function parentChain(snapshot: SearchSnapshot, id: number): number[] {
  const chain: number[] = []
  const seen = new Set<number>()
  let cursor: number | null = snapshot.nodes[id]?.parentId ?? null
  chain.push(id)
  while (cursor !== null && !seen.has(cursor)) {
    seen.add(cursor)
    chain.push(cursor)
    cursor = snapshot.nodes[cursor]?.parentId ?? null
  }
  return chain
}

/**
 * Edges between two current nodes through their lowest common ancestor. The
 * first half travels up (backtracking), the second half down to the new node.
 */
function buildPulseEdges(
  snapshot: SearchSnapshot,
  fromId: number,
  toId: number,
): PulseEdge[] {
  const fromChain = parentChain(snapshot, fromId)
  const toChain = parentChain(snapshot, toId)
  const toSet = new Set(toChain)
  const lca = fromChain.find((id) => toSet.has(id))
  if (lca === undefined) return []

  const edges: PulseEdge[] = []
  let delay = 0
  let cursor = fromId
  while (cursor !== lca) {
    const parent = snapshot.nodes[cursor]?.parentId
    if (parent === null || parent === undefined) break
    edges.push({ id: `e-${parent}-${cursor}`, direction: 'up', delay })
    delay += 45
    cursor = parent
  }

  const downChain = [lca, ...toChain.slice(0, toChain.indexOf(lca)).reverse()]
  for (let index = 1; index < downChain.length; index += 1) {
    const parent = downChain[index - 1]
    const child = downChain[index]
    edges.push({ id: `e-${parent}-${child}`, direction: 'down', delay })
    delay += 45
  }
  return edges
}

function TreeCanvasInner({ snapshot, followCamera, reducedMotion }: TreeCanvasProps) {
  const { setCenter, fitView } = useReactFlow()
  const { x: viewX, y: viewY, zoom } = useViewport()
  const manual = useTreeViewStore((state) => state.manual)
  const autoCollapse = useTreeViewStore((state) => state.autoCollapse)
  const collapsed = useTreeViewStore((state) => state.collapsed)
  const cameraTargetId = useTreeViewStore((state) => state.cameraTargetId)
  const setCollapsed = useTreeViewStore((state) => state.setCollapsed)
  const setHovered = useTreeViewStore((state) => state.setHovered)
  const setSelected = useTreeViewStore((state) => state.setSelected)
  const expandAncestors = useTreeViewStore((state) => state.expandAncestors)
  const expandAll = useTreeViewStore((state) => state.expandAll)
  const collapseFinished = useTreeViewStore((state) => state.collapseFinished)
  const setAutoCollapse = useTreeViewStore((state) => state.setAutoCollapse)
  const clearCameraTarget = useTreeViewStore((state) => state.clearCameraTarget)

  /** Effective visibility, including both manual and automatic collapsing. */
  const visibility = useMemo(
    () => computeVisibility(snapshot, manual, autoCollapse),
    [snapshot, manual, autoCollapse],
  )

  // Publish the automatic collapsed set for the toolbar/sidebar without
  // recreating it when the contents have not changed.
  useEffect(() => {
    setCollapsed(visibility.collapsed)
  }, [visibility, setCollapsed])

  const { nodes, edges } = useTreeLayout(snapshot, visibility, reducedMotion)

  const [pulse, setPulse] = useState<EdgePulse | null>(null)
  const [ghosts, setGhosts] = useState<Ghost[]>([])
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ghostTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previous = useRef<{ snapshot: SearchSnapshot; nodes: Node<StateNodeData>[] } | null>(
    null,
  )
  const pulseToken = useRef(0)

  // Backtrack pulses and undo fade-outs are driven by transitions between
  // snapshots, so they need both the previous and the current layout.
  useEffect(() => {
    const prev = previous.current
    previous.current = { snapshot, nodes }
    if (!prev) return

    const fromId = prev.snapshot.currentId
    const toId = snapshot.currentId
    if (fromId === null || toId === null || fromId === toId) return
    if (!prev.snapshot.nodes[fromId] || !snapshot.nodes[toId]) return

    if (pulseTimer.current !== null) {
      clearTimeout(pulseTimer.current)
      pulseTimer.current = null
    }
    if (ghostTimer.current !== null) {
      clearTimeout(ghostTimer.current)
      ghostTimer.current = null
    }

    // Undo moves the current node to its parent and removes the children that
    // the undone step created. Keep them as ghosts while they fade out.
    const undoing = prev.snapshot.nodes[fromId]?.parentId === toId
    if (undoing && !reducedMotion) {
      const positions = new Map(prev.nodes.map((node) => [Number(node.id), node.position]))
      const removed: Ghost[] = []
      for (const [idString, node] of Object.entries(prev.snapshot.nodes)) {
        const id = Number(idString)
        if (snapshot.nodes[id]) continue
        const position = positions.get(id)
        if (!position) continue
        removed.push({
          key: `${id}-${Date.now()}`,
          id,
          state: node.state,
          status: node.status,
          x: position.x,
          y: position.y,
          delay: 0,
        })
      }
      if (removed.length > 0) {
        removed.sort((a, b) => b.id - a.id)
        const faded = removed.map((ghost, index) => ({ ...ghost, delay: index * 18 }))
        setGhosts(faded)
        ghostTimer.current = setTimeout(() => {
          setGhosts([])
          ghostTimer.current = null
        }, 360 + faded.length * 18)
      }
    }

    // A new current that is not the previous node's child is a backtrack.
    const forwardStep = prev.snapshot.nodes[fromId]?.children.includes(toId) ?? false
    if (!forwardStep) {
      const visibleEdges = new Set(edges.map((edge) => edge.id))
      const candidates = buildPulseEdges(snapshot, fromId, toId).filter((edge) =>
        visibleEdges.has(edge.id),
      )
      if (candidates.length > 0) {
        pulseToken.current += 1
        const token = pulseToken.current
        setPulse({
          token,
          edges: new Map(candidates.map((edge) => [edge.id, edge])),
        })
        pulseTimer.current = setTimeout(() => {
          setPulse(null)
          pulseTimer.current = null
        }, 700 + candidates.length * 45)
      }
    }
  }, [snapshot, nodes, edges, reducedMotion])

  useEffect(
    () => () => {
      if (pulseTimer.current !== null) clearTimeout(pulseTimer.current)
      if (ghostTimer.current !== null) clearTimeout(ghostTimer.current)
    },
    [],
  )

  const renderedEdges = useMemo(() => {
    if (!pulse) return edges
    return edges.map((edge) => {
      const pulseEdge = pulse.edges.get(edge.id)
      if (!pulseEdge) return edge
      return {
        ...edge,
        data: {
          ...(edge.data as TreeEdgeData | undefined),
          pulse: true,
          pulseToken: pulse.token,
          pulseDirection: pulseEdge.direction,
          pulseDelay: pulseEdge.delay,
        } as TreeEdgeData,
      }
    })
  }, [edges, pulse])

  const positions = useMemo(() => {
    const map = new Map<number, { x: number; y: number }>()
    for (const node of nodes) map.set(Number(node.id), node.position)
    return map
  }, [nodes])

  const initialized = useRef(false)
  const lastCurrentId = useRef<number | null>(snapshot.currentId)
  const pendingTarget = useRef<number | null>(null)

  const onInit = useCallback(
    (instance: ReactFlowInstance<Node<StateNodeData>, Edge<TreeEdgeData>>) => {
      if (initialized.current) return
      initialized.current = true
      instance.fitView({ padding: 0.2, duration: reducedMotion ? 0 : 250 })
    },
    [reducedMotion],
  )

  // Follow the live search, but never pan into a collapsed subtree.
  useEffect(() => {
    const id = snapshot.currentId
    if (!followCamera || id === null) {
      lastCurrentId.current = id
      return
    }
    if (lastCurrentId.current === id) return
    lastCurrentId.current = id
    const position = positions.get(id)
    if (!position) return
    setCenter(position.x + NODE_WIDTH / 2, position.y + NODE_HEIGHT / 2, {
      zoom: 1,
      duration: reducedMotion ? 0 : 450,
    })
  }, [snapshot.currentId, followCamera, positions, setCenter, reducedMotion])

  // Sidebar/selection focus: expand hidden ancestors, then centre the node.
  useEffect(() => {
    if (cameraTargetId === null) {
      pendingTarget.current = null
      return
    }
    if (!snapshot.nodes[cameraTargetId]) {
      clearCameraTarget()
      return
    }
    const position = positions.get(cameraTargetId)
    if (!position) {
      if (pendingTarget.current === cameraTargetId) {
        // Expanding did not reveal it (stale snapshot); stop retrying.
        pendingTarget.current = null
        clearCameraTarget()
        return
      }
      pendingTarget.current = cameraTargetId
      expandAncestors(cameraTargetId, snapshot)
      return
    }

    pendingTarget.current = null
    const center = () => {
      setCenter(position.x + NODE_WIDTH / 2, position.y + NODE_HEIGHT / 2, {
        zoom: 1,
        duration: reducedMotion ? 0 : 450,
      })
      clearCameraTarget()
    }
    if (typeof window.requestAnimationFrame === 'function') {
      const handle = window.requestAnimationFrame(center)
      return () => window.cancelAnimationFrame(handle)
    }
    center()
    return undefined
  }, [
    cameraTargetId,
    positions,
    snapshot,
    expandAncestors,
    clearCameraTarget,
    setCenter,
    reducedMotion,
  ])

  const onNodeClick: NodeMouseHandler<Node<StateNodeData>> = useCallback(
    (_event, node) => {
      setSelected(Number(node.id))
    },
    [setSelected],
  )

  const onNodeMouseEnter: NodeMouseHandler<Node<StateNodeData>> = useCallback(
    (_event, node) => {
      setHovered(Number(node.id))
    },
    [setHovered],
  )

  const onNodeMouseLeave: NodeMouseHandler<Node<StateNodeData>> = useCallback(() => {
    setHovered(null)
  }, [setHovered])

  const onPaneClick = useCallback(() => {
    setSelected(null)
    setHovered(null)
  }, [setSelected, setHovered])

  const totalCount = Object.keys(snapshot.nodes).length

  return (
    <div
      className={styles.wrap}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      role="region"
      aria-label="State-space tree"
    >
      <ReactFlow
        className={styles.flow}
        nodes={nodes}
        edges={renderedEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={onInit}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onPaneClick={onPaneClick}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={false}
        panOnScroll
        zoomOnDoubleClick={false}
        minZoom={0.1}
        maxZoom={1.6}
        onlyRenderVisibleElements
        attributionPosition="bottom-center"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.2}
          color="var(--bg-grid)"
        />
        <Controls
          className={styles.controls}
          showInteractive={false}
          position="bottom-left"
        />
        <MiniMap
          className={styles.minimap}
          pannable
          zoomable
          nodeColor={stateColor}
          nodeStrokeColor={stateColor}
          nodeBorderRadius={6}
          maskColor="var(--overlay)"
          position="bottom-right"
          ariaLabel="Tree minimap"
        />
        <Panel position="top-left" className={styles.panel}>
          <TreeToolbar
            visibleCount={visibility.visible.size}
            totalCount={totalCount}
            collapsedCount={collapsed.size}
            autoCollapse={autoCollapse}
            onExpandAll={expandAll}
            onCollapseFinished={() => collapseFinished(snapshot)}
            onToggleAutoCollapse={() => setAutoCollapse(!autoCollapse)}
            onFitView={() => fitView({ padding: 0.2, duration: reducedMotion ? 0 : 300 })}
          />
        </Panel>
        <Panel position="top-right" className={styles.panel}>
          <Legend />
        </Panel>
      </ReactFlow>
      {ghosts.length > 0 ? (
        <div className={styles.ghosts} aria-hidden="true">
          {ghosts.map((ghost) => (
            <div
              key={ghost.key}
              className={styles.ghost}
              data-status={ghost.status}
              style={{
                left: ghost.x * zoom + viewX,
                top: ghost.y * zoom + viewY,
                width: NODE_WIDTH * zoom,
                height: NODE_HEIGHT * zoom,
                animationDelay: `${ghost.delay}ms`,
                fontSize: `${10 * zoom}px`,
              }}
            >
              <span>{String(ghost.state).padStart(9, '0')}</span>
            </div>
          ))}
        </div>
      ) : null}
      {nodes.length === 0 ? (
        <div className={styles.empty}>No search yet — press Start.</div>
      ) : null}
    </div>
  )
}

/**
 * State-space tree canvas. The provider is local so the component can be
 * embedded anywhere without leaking a React Flow store.
 */
export default function TreeCanvas(props: TreeCanvasProps) {
  return (
    <ReactFlowProvider>
      <TreeCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
