import { useId } from 'react'
import { ArrowRight, Play } from 'lucide-react'
import type { StartGoalPanelProps } from '../../contract/ui'
import BoardEditor from './BoardEditor'
import styles from './StartGoalPanel.module.css'

const UNSOLVABLE_FALLBACK = 'This start and goal pair is unsolvable. Adjust either board to continue.'

/** Editable start/goal pair with the prominent Start search action. */
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
  const titleId = useId()
  const blocked = !solvable || disabled
  const message = error ?? (!solvable ? UNSOLVABLE_FALLBACK : null)
  const startTitle = !solvable
    ? 'Start search — this pair is unsolvable'
    : disabled
      ? 'Start search — boards are disabled'
      : 'Start the search from these boards'

  return (
    <section className={styles.panel} aria-labelledby={titleId}>
      <header className={styles.header}>
        <div className={styles.copy}>
          <h2 className={styles.title} id={titleId}>
            Start &amp; goal
          </h2>
          <p className={styles.subtitle}>
            Click a tile, then another, to swap them. The blank is a tile too.
          </p>
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
      </header>

      <div className={styles.boards}>
        <div className={styles.boardSlot}>
          <BoardEditor
            label="Initial state"
            state={start}
            onChange={onStartChange}
            disabled={disabled}
            size="md"
          />
        </div>
        <span className={styles.arrow} aria-hidden="true">
          <ArrowRight />
        </span>
        <div className={styles.boardSlot}>
          <BoardEditor
            label="Goal state"
            state={goal}
            onChange={onGoalChange}
            disabled={disabled}
            size="md"
          />
        </div>
      </div>

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
