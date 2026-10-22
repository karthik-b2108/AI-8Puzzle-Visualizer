import styles from './StateDiagram.module.css'

interface StateDiagramProps {
  /** 9-digit state, row by row, with 9 for the blank. */
  state: number
  /** Read aloud instead of the raw integer. */
  label: string
}

/** Small read-only 3 × 3 board used to show an example state visually. */
export default function StateDiagram({ state, label }: StateDiagramProps) {
  const digits = String(state).padStart(9, '0').split('').map(Number)
  const spoken = digits.map((digit) => (digit === 9 ? 'blank' : String(digit))).join(' ')

  return (
    <div className={styles.board} role="img" aria-label={`${label}: ${spoken}`}>
      {digits.map((digit, index) =>
        digit === 9 ? (
          <span key={index} className={styles.blank} aria-hidden="true" />
        ) : (
          <span key={index} className={styles.tile} aria-hidden="true">
            {digit}
          </span>
        ),
      )}
    </div>
  )
}
