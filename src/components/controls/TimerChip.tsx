import { Timer } from 'lucide-react'
import type { TimerChipProps } from '../../contract/ui'
import { formatClock } from '../../utils/format'
import styles from './TimerChip.module.css'

/** Live engine clock. Presentational: the store supplies `elapsedMs`. */
export default function TimerChip({ elapsedMs, running = false }: TimerChipProps) {
  return (
    <span
      className={styles.chip}
      role="timer"
      aria-label="Elapsed engine time"
      title="Elapsed engine time"
      data-running={String(running)}
    >
      <span className={styles.icon} aria-hidden="true">
        <Timer />
      </span>
      <span className={styles.value}>{formatClock(elapsedMs)}</span>
      <span className={styles.live} aria-hidden="true" data-running={String(running)} />
    </span>
  )
}
