import { useId } from 'react'
import styles from './DfsDiagram.module.css'

type NodeId = 'A' | 'B' | 'C' | 'D' | 'E'
type NodeVisual = 'frontier' | 'visited' | 'current' | 'dead'

interface NodePosition {
  x: number
  y: number
}

const NODE_POSITIONS: Record<NodeId, NodePosition> = {
  A: { x: 84, y: 58 },
  B: { x: 42, y: 106 },
  C: { x: 96, y: 106 },
  D: { x: 150, y: 106 },
  E: { x: 24, y: 154 },
}

const EDGES: ReadonlyArray<readonly [NodeId, NodeId]> = [
  ['A', 'B'],
  ['A', 'C'],
  ['A', 'D'],
  ['B', 'E'],
]

const NODE_STYLES: Record<
  NodeVisual,
  { fill: string; stroke: string; text: string; dash?: string }
> = {
  frontier: {
    fill: 'var(--status-frontier-soft)',
    stroke: 'var(--status-frontier)',
    text: 'var(--text)',
    dash: '3 2',
  },
  visited: {
    fill: 'var(--status-visited-soft)',
    stroke: 'var(--status-visited)',
    text: 'var(--text)',
  },
  current: {
    fill: 'var(--accent)',
    stroke: 'var(--accent-strong)',
    text: 'var(--accent-contrast)',
  },
  dead: {
    fill: 'var(--surface-3)',
    stroke: 'var(--border-strong)',
    text: 'var(--text-subtle)',
    dash: '2 2',
  },
}

interface Snapshot {
  title: string
  caption: string
  /** Bottom of the stack first, top last. */
  stack: readonly NodeId[]
  visible: readonly NodeId[]
  visual: Partial<Record<NodeId, NodeVisual>>
}

const SNAPSHOTS: readonly Snapshot[] = [
  {
    title: 'Push the root',
    caption: 'The start state A enters the empty stack. It is the only node in the frontier.',
    stack: ['A'],
    visible: ['A'],
    visual: { A: 'frontier' },
  },
  {
    title: 'Pop the top node',
    caption:
      'A comes off the stack, is marked visited and is expanded. Its three children are about to be created.',
    stack: [],
    visible: ['A'],
    visual: { A: 'current' },
  },
  {
    title: 'Push the children',
    caption: 'D, C and B are pushed in reverse order, so B is last in and first out.',
    stack: ['D', 'C', 'B'],
    visible: ['A', 'B', 'C', 'D'],
    visual: { A: 'visited', B: 'frontier', C: 'frontier', D: 'frontier' },
  },
  {
    title: 'Backtrack to the next sibling',
    caption: 'B expands to E. E is a dead end, so the next pop falls back to C.',
    stack: ['D', 'C'],
    visible: ['A', 'B', 'C', 'D', 'E'],
    visual: {
      A: 'visited',
      B: 'visited',
      C: 'frontier',
      D: 'frontier',
      E: 'dead',
    },
  },
]

const VIEW_WIDTH = 320
const VIEW_HEIGHT = 180
const NODE_RADIUS = 13

const STACK_X = 218
const STACK_WIDTH = 80
const STACK_ROW_HEIGHT = 24
const STACK_GAP = 4
const STACK_BOTTOM = 166

/**
 * Four snapshots of the frontier stack next to a schematic search tree.
 * Each snapshot is an inline SVG with a title and description; the grid
 * reflows to one column on narrow screens so the text stays legible.
 */
export default function DfsDiagram() {
  const uid = useId().replace(/:/g, '')

  return (
    <figure className={styles.figure}>
      <div className={styles.grid}>
        {SNAPSHOTS.map((snapshot, index) => {
          const titleId = `${uid}-title-${index}`
          const descriptionId = `${uid}-desc-${index}`
          const stackDescription =
            snapshot.stack.length > 0 ? snapshot.stack.join(', ') : 'empty'

          return (
            <div className={styles.snapshot} key={snapshot.title}>
              <svg
                className={styles.svg}
                viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
                role="img"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
              >
                <title id={titleId}>{`Step ${index + 1}: ${snapshot.title}`}</title>
                <desc id={descriptionId}>
                  {`${snapshot.caption} Stack, bottom to top: ${stackDescription}.`}
                </desc>

                <text className={styles.areaLabel} x={12} y={22}>
                  TREE
                </text>
                <text className={styles.areaLabel} x={STACK_X} y={22}>
                  STACK
                </text>
                <text className={styles.areaHint} x={STACK_X} y={35}>
                  top = last
                </text>

                {EDGES.map(([parent, child]) => {
                  if (
                    !snapshot.visible.includes(parent) ||
                    !snapshot.visible.includes(child)
                  ) {
                    return null
                  }
                  const from = NODE_POSITIONS[parent]
                  const to = NODE_POSITIONS[child]
                  const childVisual = snapshot.visual[child] ?? 'frontier'
                  const explored =
                    childVisual === 'visited' ||
                    childVisual === 'current' ||
                    childVisual === 'dead'

                  return (
                    <line
                      key={`${parent}-${child}`}
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={explored ? 'var(--status-visited)' : 'var(--border-strong)'}
                      strokeOpacity={explored ? 0.55 : 1}
                      strokeWidth={1.5}
                    />
                  )
                })}

                {snapshot.visible.map((nodeId) => {
                  const position = NODE_POSITIONS[nodeId]
                  const visual = snapshot.visual[nodeId] ?? 'frontier'
                  const nodeStyle = NODE_STYLES[visual]

                  return (
                    <g key={nodeId}>
                      <circle
                        cx={position.x}
                        cy={position.y}
                        r={NODE_RADIUS}
                        fill={nodeStyle.fill}
                        stroke={nodeStyle.stroke}
                        strokeWidth={1.5}
                        strokeDasharray={nodeStyle.dash}
                      />
                      <text
                        className={styles.nodeLabel}
                        x={position.x}
                        y={position.y}
                        fill={nodeStyle.text}
                        textAnchor="middle"
                        dominantBaseline="central"
                      >
                        {nodeId}
                      </text>
                    </g>
                  )
                })}

                {snapshot.stack.length === 0 ? (
                  <g>
                    <rect
                      x={STACK_X}
                      y={STACK_BOTTOM - STACK_ROW_HEIGHT}
                      width={STACK_WIDTH}
                      height={STACK_ROW_HEIGHT}
                      rx={6}
                      fill="none"
                      stroke="var(--border-strong)"
                      strokeDasharray="3 3"
                    />
                    <text
                      className={styles.emptyLabel}
                      x={STACK_X + STACK_WIDTH / 2}
                      y={STACK_BOTTOM - STACK_ROW_HEIGHT / 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      empty
                    </text>
                  </g>
                ) : null}

                {snapshot.stack.map((nodeId, stackIndex) => {
                  const isTop = stackIndex === snapshot.stack.length - 1
                  const y =
                    STACK_BOTTOM -
                    STACK_ROW_HEIGHT -
                    stackIndex * (STACK_ROW_HEIGHT + STACK_GAP)

                  return (
                    <g key={`${nodeId}-${stackIndex}`}>
                      <rect
                        x={STACK_X}
                        y={y}
                        width={STACK_WIDTH}
                        height={STACK_ROW_HEIGHT}
                        rx={6}
                        fill={isTop ? 'var(--accent)' : 'var(--surface-2)'}
                        stroke={isTop ? 'var(--accent-strong)' : 'var(--border)'}
                        strokeWidth={isTop ? 2 : 1}
                      />
                      <text
                        className={styles.stackLabel}
                        x={STACK_X + STACK_WIDTH / 2}
                        y={y + STACK_ROW_HEIGHT / 2}
                        fill={isTop ? 'var(--accent-contrast)' : 'var(--text)'}
                        textAnchor="middle"
                        dominantBaseline="central"
                      >
                        {nodeId}
                      </text>
                      {isTop ? (
                        <polygon
                          points={`${STACK_X - 8},${y + 7} ${STACK_X - 8},${y + 17} ${STACK_X - 2},${y + 12}`}
                          fill="var(--accent)"
                        />
                      ) : null}
                    </g>
                  )
                })}
              </svg>

              <p className={styles.step}>
                <span className={styles.stepNumber} aria-hidden="true">
                  {index + 1}
                </span>
                <span className={styles.stepTitle}>{snapshot.title}</span>
              </p>
              <p className={styles.caption}>{snapshot.caption}</p>
            </div>
          )
        })}
      </div>

      <ul className={styles.legend} aria-label="Diagram legend">
        <li className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.swatchFrontier}`} aria-hidden="true" />
          Frontier (on the stack)
        </li>
        <li className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.swatchVisited}`} aria-hidden="true" />
          Visited / expanded
        </li>
        <li className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.swatchTop}`} aria-hidden="true" />
          Next to pop (top of stack)
        </li>
        <li className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.swatchDead}`} aria-hidden="true" />
          Dead end (no new children)
        </li>
      </ul>
    </figure>
  )
}
