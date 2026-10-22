import { Play } from 'lucide-react'
import type { StartGoalPanelProps } from '../../contract/ui'
import BoardEditor from './BoardEditor'
import styles from './StartGoalPanel.module.css'

const UNSOLVABLE_FALLBACK = 'This start and goal pair is unsolvable. Adjust either board to continue.'

/**
 * Editable start/end pair for the setup rail. Boards stack vertically so the
 * panel fits a narrow sidebar without shrinking the tiles.
 */
export default function StartGoalPanel({
  start,
  goal,
  onStartChange,
  onGoalChange,
  onStart,
  solvable,
  dirty,
  error,
  disabled = false,
}: StartGoalPanelProps) {
  const blocked = !solvable || disabled
  const message = error ?? (!solvable ? UNSOLVABLE_FALLBACK : null)
  const startTitle = !solvable
    ? 'Start search — this pair is unsolvable'
    : disabled
      ? 'Start search — boards are disabled'
      : 'Start the search from these boards'

  return (
    <section className={styles.panel} aria-label="Start and end states">
      <div className={styles.boards}>
        <div className={styles.boardSlot}>
          <BoardEditor
            label="Start state"
            state={start}
            onChange={onStartChange}
            disabled={disabled}
            size="md"
          />
        </div>
        <div className={styles.boardSlot}>
          <BoardEditor
            label="End state"
            state={goal}
            onChange={onGoalChange}
            disabled={disabled}
            size="md"
          />
        </div>
      </div>

      <button
        type="button"
        className={styles.start}
        disabled={blocked}
        onClick={onStart}
        title={startTitle}
      >
        <Play aria-hidden="true" />
        Start search
      </button>

      {message ? (
        <p className={styles.error} role="alert">
          {message}
        </p>
      ) : null}

      {dirty ? (
        <p className={styles.dirty} role="status">
          Start the search to apply board changes
        </p>
      ) : null}
    </section>
  )
}
