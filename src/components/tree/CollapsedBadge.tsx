import { useEffect, useRef } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import type { HiddenCounts } from './collapse'
import { formatNumber } from '../../utils/format'
import styles from './CollapsedBadge.module.css'

export interface CollapsedBadgeProps {
  id: number
  hidden: HiddenCounts
  /** Single click / Enter: expand one level. */
  onExpandOne: (id: number) => void
  /** Double click: expand the whole subtree (subject to the hard cap). */
  onExpandSubtree: (id: number) => void
}

/** Delay that lets a second click turn a single click into a double click. */
const DOUBLE_CLICK_DELAY = 220

function tooltipText(hidden: HiddenCounts): string {
  const parts: string[] = [`+${formatNumber(hidden.total)} hidden`]
  if (hidden.byStatus.frontier > 0) {
    parts.push(`${formatNumber(hidden.byStatus.frontier)} frontier`)
  }
  if (hidden.byStatus.visited > 0) {
    parts.push(`${formatNumber(hidden.byStatus.visited)} visited`)
  }
  if (hidden.byStatus.duplicate > 0) {
    parts.push(`${formatNumber(hidden.byStatus.duplicate)} duplicate`)
  }
  if (hidden.byStatus.goal > 0) {
    parts.push(`${formatNumber(hidden.byStatus.goal)} goal`)
  }
  return parts.join(' · ')
}

/**
 * The `+N` pill hanging under a collapsed node. Click/Enter expands one level,
 * double click reveals the whole subtree.
 */
export function CollapsedBadge({
  id,
  hidden,
  onExpandOne,
  onExpandSubtree,
}: CollapsedBadgeProps) {
  const timer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    },
    [],
  )

  const clearTimer = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    event.preventDefault()
    if (event.detail >= 2) {
      clearTimer()
      return
    }
    clearTimer()
    timer.current = window.setTimeout(() => {
      timer.current = null
      onExpandOne(id)
    }, DOUBLE_CLICK_DELAY)
  }

  const handleDoubleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    event.preventDefault()
    clearTimer()
    onExpandSubtree(id)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      event.stopPropagation()
      clearTimer()
      onExpandOne(id)
    }
  }

  const label = `Expand ${formatNumber(hidden.total)} hidden ${
    hidden.total === 1 ? 'node' : 'nodes'
  }`

  return (
    <span className={styles.wrap}>
      <button
        type="button"
        className={`${styles.badge} nodrag nopan`}
        aria-label={label}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
      >
        <ChevronDown size={10} strokeWidth={2.8} aria-hidden="true" />
        <span aria-hidden="true">+{formatNumber(hidden.total)}</span>
      </button>
      <span role="tooltip" className={styles.tooltip}>
        {tooltipText(hidden)}
      </span>
    </span>
  )
}
