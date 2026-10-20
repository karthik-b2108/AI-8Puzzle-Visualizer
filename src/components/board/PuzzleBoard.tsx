import type { PuzzleBoardProps } from '../../contract/ui'
import { digitsOf } from './digits'
import Tile from './Tile'
import styles from './PuzzleBoard.module.css'

/**
 * Read-only (or click-selectable) 3×3 puzzle board. Boards are rendered from
 * the 9-digit integer; the blank is a Tile like any other.
 */
export default function PuzzleBoard({
  state,
  size = 'md',
  selectedIndex = null,
  onTileSelect,
  highlightIndices,
  dimIndices,
  label,
  disabled = false,
}: PuzzleBoardProps) {
  const digits = digitsOf(state)
  const highlighted = new Set(highlightIndices ?? [])
  const dimmed = new Set(dimIndices ?? [])

  return (
    <div className={`${styles.board} ${styles[size]}`} data-size={size}>
      <div className={styles.grid} role="group" aria-label={label ?? '8-puzzle board'}>
        {digits.map((digit, index) => (
          <Tile
            key={index}
            digit={digit}
            index={index}
            size={size}
            selected={selectedIndex === index}
            highlighted={highlighted.has(index)}
            dimmed={dimmed.has(index)}
            disabled={disabled}
            onClick={onTileSelect ? () => onTileSelect(index) : undefined}
          />
        ))}
      </div>
    </div>
  )
}
