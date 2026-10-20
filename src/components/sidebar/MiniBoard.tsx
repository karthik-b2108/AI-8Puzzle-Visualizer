import styles from './MiniBoard.module.css'

interface MiniBoardProps {
  state: number
  size?: 'xs' | 'sm'
}

/** A tiny, non-interactive 3×3 board for list rows. */
export default function MiniBoard({ state, size = 'sm' }: MiniBoardProps) {
  const digits = String(state).padStart(9, '0').split('')
  return (
    <span className={`${styles.board} ${size === 'xs' ? styles.xs : styles.sm}`} aria-hidden="true">
      {digits.map((digit, index) => (
        <span key={index} className={digit === '9' ? styles.blank : styles.cell}>
          {digit === '9' ? '' : digit}
        </span>
      ))}
    </span>
  )
}
