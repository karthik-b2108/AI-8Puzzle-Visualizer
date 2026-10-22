import { Maximize2 } from 'lucide-react'
import { formatNumber } from '../../utils/format'
import styles from './TreeToolbar.module.css'

export interface TreeToolbarProps {
  nodeCount: number
  onFitView: () => void
}

/** Floating controls for the state-space tree. */
export function TreeToolbar({ nodeCount, onFitView }: TreeToolbarProps) {
  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Tree view controls">
      <div className={styles.buttons}>
        <button
          type="button"
          className={`${styles.button} ${styles.iconOnly}`}
          onClick={onFitView}
          title="Fit the tree to the viewport"
          aria-label="Fit the tree to the viewport"
        >
          <Maximize2 size={14} aria-hidden="true" />
        </button>
      </div>
      <p className={styles.count} data-testid="tree-count">
        <strong>{formatNumber(nodeCount)}</strong> {nodeCount === 1 ? 'node' : 'nodes'}
      </p>
    </div>
  )
}
