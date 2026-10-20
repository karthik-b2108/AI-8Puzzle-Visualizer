import { CircleCheckBig, Play, SearchX } from 'lucide-react'
import type { ResultCardProps } from '../../contract/ui'
import { formatDuration, formatNumber } from '../../utils/format'
import StatBadge from './StatBadge'
import styles from './ResultCard.module.css'

export default function ResultCard({ result, config, replaying, onReplay }: ResultCardProps) {
  if (!result) return null
  const found = result.outcome === 'found'

  return (
    <section
      className={`${styles.card} ${found ? styles.found : styles.missed}`}
      aria-label={found ? 'Search result: goal reached' : 'Search result: not found'}
    >
      <header className={styles.header}>
        <span className={styles.icon} aria-hidden="true">
          {found ? <CircleCheckBig size={22} /> : <SearchX size={22} />}
        </span>
        <div className={styles.heading}>
          <h2 className={styles.title}>{found ? 'Goal reached' : 'Not found'}</h2>
          <p className={styles.subtitle}>
            {found
              ? `Solution in ${result.moves} ${result.moves === 1 ? 'move' : 'moves'}.`
              : `Not found within depth limit ${config.depthLimit}.`}
          </p>
        </div>
      </header>

      <div className={styles.stats}>
        <StatBadge label="Moves" value={result.moves ?? '—'} tone={found ? 'accent' : 'neutral'} />
        <StatBadge label="Generated" value={formatNumber(result.metrics.generated)} />
        <StatBadge label="Explored" value={formatNumber(result.metrics.explored)} />
        <StatBadge label="Max depth" value={result.metrics.maxDepth} />
        <StatBadge label="Time" value={formatDuration(result.metrics.elapsedMs)} />
      </div>

      {found ? (
        <button className={styles.replay} type="button" onClick={onReplay} disabled={replaying}>
          <Play size={14} aria-hidden="true" />
          {replaying ? 'Replaying…' : 'Replay solution'}
        </button>
      ) : (
        <p className={styles.hint}>
          Raise the depth limit or try the other board pair to keep searching.
        </p>
      )}
    </section>
  )
}
