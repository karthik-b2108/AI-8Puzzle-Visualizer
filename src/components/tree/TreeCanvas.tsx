import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
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

function TreeCanvasInner({ snapshot, followCamera, reducedMotion }: TreeCanvasProps) {
  const { setCenter, fitView } = useReactFlow()
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

  const { nodes, edges } = useTreeLayout(snapshot, visibility)

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
        edges={edges}
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
