import type { StepInspectorProps } from '../../contract/ui'
import { pluralize } from '../../utils/format'
import PuzzleBoard from '../board/PuzzleBoard'
import styles from './StepInspector.module.css'

function describe(narration: StepInspectorProps['narration']): string {
  if (!narration) return 'Press Start, then Step to walk through the search.'
  const popped = narration.poppedId === null ? 'a node' : `node #${narration.poppedId}`
  switch (narration.kind) {
    case 'step': {
      if (narration.poppedId === null) return 'The stack was empty, so the search finished.'
      const children = pluralize(narration.pushed, 'child', 'children')
      const prune = narration.pruned > 0 ? `, pruned ${narration.pruned}` : ''
      return narration.visited
        ? `Popped ${popped}, pushed ${narration.pushed} ${children}${prune}.`
        : `Popped ${popped} — already visited, so it was pruned.`
    }
    case 'undo':
      return narration.pushed > 0
        ? `Undid the step — removed ${narration.pushed} pushed ${pluralize(narration.pushed, 'node')} and restored ${popped}.`
        : `Undid the step — restored ${popped}.`
    case 'redo':
      return narration.pushed > 0
        ? `Redid the step — replayed ${narration.pushed} ${pluralize(narration.pushed, 'child', 'children')}.`
        : 'Redid the step.'
    case 'reset':
      return 'Search reset to the initial state.'
  }
}

/** Basic inspector: the current board, node id and depth. */
export default function StepInspector({ snapshot, narration }: StepInspectorProps) {
  const current = snapshot.currentId !== null ? snapshot.nodes[snapshot.currentId] : null
  const parent = snapshot.parentOfCurrentId !== null ? snapshot.nodes[snapshot.parentOfCurrentId] : null

  const highlight = current && parent ? indicesThatMoved(parent.state, current.state) : []

  return (
    <aside className={styles.card} aria-label="Step inspector">
      <header className={styles.header}>
        <h2 className={styles.title}>Step inspector</h2>
        {current ? <span className={styles.depth}>depth {current.depth}</span> : null}
      </header>

      {current ? (
        <div className={styles.content}>
          <div className={styles.currentRow}>
            <div className={styles.boardWrap}>
              <PuzzleBoard
                state={current.state}
                size="md"
                highlightIndices={highlight}
                label="Current node"
              />
            </div>
            <dl className={styles.fields}>
              <div className={styles.field}>
                <dt>Node</dt>
                <dd className="mono">#{current.id}</dd>
              </div>
              <div className={styles.field}>
                <dt>Depth</dt>
                <dd className="mono">{current.depth}</dd>
              </div>
            </dl>
          </div>

          <p className={styles.narration} aria-live="polite" aria-atomic="true">
            {describe(narration)}
          </p>
        </div>
      ) : (
        <p className={styles.empty}>
          No step yet. Press <kbd>Space</kbd> to expand the first node.
        </p>
      )}
    </aside>
  )
}

function indicesThatMoved(previous: number, next: number): number[] {
  const a = String(previous).padStart(9, '0').split('')
  const b = String(next).padStart(9, '0').split('')
  const moved: number[] = []
  a.forEach((digit, index) => {
    if (digit !== b[index]) moved.push(index)
  })
  return moved
}
