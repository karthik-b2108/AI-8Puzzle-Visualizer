import { Layers, Maximize2, FoldVertical, UnfoldVertical } from 'lucide-react'
import { formatNumber } from '../../utils/format'
import styles from './TreeToolbar.module.css'

export interface TreeToolbarProps {
  visibleCount: number
  totalCount: number
  collapsedCount: number
  autoCollapse: boolean
  onExpandAll: () => void
  onCollapseFinished: () => void
  onToggleAutoCollapse: () => void
  onFitView: () => void
}

/** Floating controls for the state-space tree. */
export function TreeToolbar({
  visibleCount,
  totalCount,
  collapsedCount,
  autoCollapse,
  onExpandAll,
  onCollapseFinished,
  onToggleAutoCollapse,
  onFitView,
}: TreeToolbarProps) {
  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Tree view controls">
      <div className={styles.buttons}>
        <button
          type="button"
          className={styles.button}
          onClick={onExpandAll}
          title="Expand every collapsed subtree"
        >
          <UnfoldVertical size={14} aria-hidden="true" />
          <span>Expand all</span>
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={onCollapseFinished}
          title="Collapse finished subtrees at depth 3 or deeper"
        >
          <FoldVertical size={14} aria-hidden="true" />
          <span>Collapse finished</span>
        </button>
        <button
          type="button"
          className={`${styles.button} ${autoCollapse ? styles.active : ''}`}
          onClick={onToggleAutoCollapse}
          aria-pressed={autoCollapse}
          title={
            autoCollapse
              ? 'Automatic collapsing is on (keeps at most 300 visible nodes)'
              : 'Automatic collapsing is off'
          }
        >
          <Layers size={14} aria-hidden="true" />
          <span>Auto-collapse</span>
        </button>
        <span className={styles.divider} aria-hidden="true" />
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
        <strong>{formatNumber(visibleCount)}</strong> of {formatNumber(totalCount)} nodes visible
        <span aria-hidden="true"> · </span>
        {formatNumber(collapsedCount)} collapsed
      </p>
    </div>
  )
}
