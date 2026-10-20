import { BaseEdge, getBezierPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import type { TreeEdgeData } from '../../hooks/useTreeLayout'
import { statusColor } from './status'
import styles from './AnimatedEdge.module.css'

const ID_SAFE = /[^a-zA-Z0-9_-]/g

/** Custom edge: status-coloured curve, arrow head, solution glow. */
export function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps) {
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.32,
  })

  const edgeData = data as TreeEdgeData | undefined
  const solution = edgeData?.solution ?? false
  const solutionIndex = edgeData?.solutionIndex ?? 0
  const color = edgeData ? statusColor(edgeData.status) : 'var(--border-strong)'
  const safeId = id.replace(ID_SAFE, '_')
  const markerId = `tree-arrow-${safeId}`
  const gradientId = `tree-solution-${safeId}`
  const stroke = solution ? `url(#${gradientId})` : color
  const pulse = edgeData?.pulse ?? false
  const pulseUp = edgeData?.pulseDirection === 'up'

  return (
    <g>
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 8 4 L 0 8 z" fill={solution ? 'var(--accent)' : color} />
        </marker>
        {solution ? (
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="55%" stopColor="var(--status-visited)" />
            <stop offset="100%" stopColor="var(--status-goal)" />
          </linearGradient>
        ) : null}
      </defs>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd ?? `url(#${markerId})`}
        interactionWidth={12}
        className={solution ? `${styles.edge} ${styles.solution}` : styles.edge}
        style={{
          stroke,
          strokeWidth: solution ? 2.4 : 1.5,
        }}
      />
      {solution ? (
        <path
          key={`${id}-solution-${solutionIndex}`}
          d={path}
          className={styles.solutionSeq}
          style={{ animationDelay: `${solutionIndex * 120}ms` }}
          aria-hidden="true"
        />
      ) : null}
      {pulse ? (
        <path
          key={`${id}-pulse-${edgeData?.pulseToken ?? 0}`}
          d={path}
          className={`${styles.pulse} ${pulseUp ? styles.pulseUp : styles.pulseDown}`}
          style={{ animationDelay: `${edgeData?.pulseDelay ?? 0}ms` }}
          aria-hidden="true"
        />
      ) : null}
    </g>
  )
}
