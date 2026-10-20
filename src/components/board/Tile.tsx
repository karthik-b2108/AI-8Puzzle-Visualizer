import type { BoardSize } from '../../contract/ui'
import styles from './Tile.module.css'

export interface TileProps {
  /** 1-8, or 9 for the blank. */
  digit: number
  index: number
  selected?: boolean
  highlighted?: boolean
  dimmed?: boolean
  disabled?: boolean
  size: BoardSize
  onClick?: () => void
}

const rowOf = (index: number) => Math.floor(index / 3) + 1
const columnOf = (index: number) => (index % 3) + 1

function classNames({
  size,
  selected,
  highlighted,
  dimmed,
  blank,
  interactive,
}: {
  size: BoardSize
  selected: boolean
  highlighted: boolean
  dimmed: boolean
  blank: boolean
  interactive: boolean
}) {
  return [
    styles.tile,
    styles[size],
    blank ? styles.blank : '',
    selected ? styles.selected : '',
    highlighted ? styles.highlighted : '',
    dimmed ? styles.dimmed : '',
    interactive ? styles.interactive : '',
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * One board cell. Digit 9 renders as an inset empty slot. Becomes a real
 * button when `onClick` is supplied, otherwise a plain div.
 */
export default function Tile({
  digit,
  index,
  selected = false,
  highlighted = false,
  dimmed = false,
  disabled = false,
  size,
  onClick,
}: TileProps) {
  const blank = digit === 9
  const label = blank
    ? `Blank, row ${rowOf(index)}, column ${columnOf(index)}`
    : `Tile ${digit}, row ${rowOf(index)}, column ${columnOf(index)}`

  const className = classNames({ size, selected, highlighted, dimmed, blank, interactive: Boolean(onClick) })

  const content = blank ? (
    <span className={styles.hole} aria-hidden="true" />
  ) : (
    <span className={styles.digit}>{digit}</span>
  )

  const data = {
    'data-tile': String(index),
    'data-blank': String(blank),
    'data-selected': String(selected),
    'data-highlighted': String(highlighted),
    'data-dimmed': String(dimmed),
  }

  if (!onClick) {
    return (
      <div className={className} aria-label={label} {...data}>
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      aria-label={label}
      onClick={onClick}
      {...data}
    >
      {content}
    </button>
  )
}
