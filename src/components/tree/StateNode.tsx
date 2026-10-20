import { memo } from 'react'
import type { KeyboardEvent } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Node, NodeProps } from '@xyflow/react'
import type { StateNodeData } from '../../hooks/useTreeLayout'
import { useTreeViewStore } from '../../store/useTreeViewStore'
import { CollapsedBadge } from './CollapsedBadge'
import { STATUS_LABEL } from './status'
import styles from './StateNode.module.css'

export type StateNodeType = Node<StateNodeData, 'state'>

function digitsOf(state: number): number[] {
  return String(state).padStart(9, '0').split('').map(Number)
}

function StateNodeComponent({ data }: NodeProps<StateNodeType>) {
  const { node, hidden, isCurrent, isHovered, isSelected, isOnSolutionPath, isGoal, depth } =
    data
  const setSelected = useTreeViewStore((state) => state.setSelected)
  const digits = digitsOf(node.state)

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setSelected(node.id)
    }
  }

  return (
    <div
      className={styles.node}
      data-status={node.status}
      data-current={isCurrent || undefined}
      data-hovered={isHovered || undefined}
      data-selected={isSelected || undefined}
      data-solution={isOnSolutionPath || undefined}
      data-goal={isGoal || undefined}
      data-collapsed={data.isCollapsed || undefined}
      data-duplicate={node.status === 'duplicate' || undefined}
      tabIndex={0}
      role="group"
      aria-roledescription="search node"
      onKeyDown={onKeyDown}
    >
      <span className={styles.statusBar} aria-hidden="true" />
      <span className={styles.board} aria-hidden="true">
        {digits.map((digit, index) => (
          <span key={index} className={digit === 9 ? styles.blank : styles.tile}>
            {digit === 9 ? '' : digit}
          </span>
        ))}
      </span>
      <span className={styles.meta}>
        <span className={styles.state}>{String(node.state).padStart(9, '0')}</span>
        <span className={styles.sub}>
          <span className={styles.depth}>d{depth}</span>
          <span className={styles.statusLabel}>{STATUS_LABEL[node.status]}</span>
        </span>
      </span>

      {hidden && hidden.total > 0 ? (
        <CollapsedBadge
          id={node.id}
          hidden={hidden}
          onExpandOne={data.onExpandOne}
          onExpandSubtree={data.onExpandSubtree}
        />
      ) : null}

      <span className="sr-only">
        Node {node.id}, state {node.state}, depth {depth}, {node.status}
      </span>

      <Handle
        type="target"
        position={Position.Top}
        className={styles.handle}
        isConnectable={false}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className={styles.handle}
        isConnectable={false}
      />
    </div>
  )
}

/** Memoised custom React Flow node. */
export const StateNode = memo(StateNodeComponent)
StateNode.displayName = 'StateNode'
