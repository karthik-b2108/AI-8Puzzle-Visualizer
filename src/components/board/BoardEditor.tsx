import { useId, useState } from 'react'
import type { BoardEditorProps } from '../../contract/ui'
import { digitsOf, encodeDigits, swapDigits } from './digits'
import PuzzleBoard from './PuzzleBoard'
import styles from './BoardEditor.module.css'

/**
 * Click one tile, then another, to swap them. The blank is a tile too.
 * Selection is local to this editor; Escape cancels it.
 */
export default function BoardEditor({
  state,
  label,
  onChange,
  error,
  disabled = false,
  size = 'md',
  hint,
}: BoardEditorProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const [wasDisabled, setWasDisabled] = useState(disabled)
  const titleId = useId()

  // Clear a stale selection as soon as the editor becomes disabled.
  if (disabled !== wasDisabled) {
    setWasDisabled(disabled)
    if (disabled) setSelected(null)
  }

  const handleTileSelect = (index: number) => {
    if (disabled) return

    if (selected === null) {
      setSelected(index)
      return
    }

    if (selected === index) {
      setSelected(null)
      return
    }

    onChange(encodeDigits(swapDigits(digitsOf(state), selected, index)))
    setSelected(null)
  }

  return (
    <section
      className={styles.editor}
      aria-labelledby={titleId}
      tabIndex={disabled ? -1 : 0}
      data-disabled={String(disabled)}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && selected !== null) {
          event.preventDefault()
          event.stopPropagation()
          setSelected(null)
        }
      }}
    >
      <div className={styles.head}>
        <h3 className={styles.label} id={titleId}>
          {label}
        </h3>
      </div>

      <PuzzleBoard
        state={state}
        size={size}
        selectedIndex={selected}
        onTileSelect={handleTileSelect}
        disabled={disabled}
        label={`${label} puzzle`}
      />

      {selected !== null ? (
        <p className={styles.selection} role="status">
          Selected tile — pick another to swap
        </p>
      ) : null}

      {hint ? <p className={styles.hint}>{hint}</p> : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}
