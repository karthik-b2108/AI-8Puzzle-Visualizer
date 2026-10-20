import { useId, useState } from 'react'
import { ChevronDown, Info } from 'lucide-react'
import styles from './Legend.module.css'

const ITEMS: Array<{ key: string; label: string }> = [
  { key: 'frontier', label: 'Frontier' },
  { key: 'visited', label: 'Visited' },
  { key: 'duplicate', label: 'Duplicate' },
  { key: 'goal', label: 'Goal' },
  { key: 'current', label: 'Current' },
  { key: 'solution', label: 'Solution path' },
]

function prefersCompactLegend(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(max-width: 900px)').matches
}

/** Compact colour legend, collapsed by default on small screens. */
export function Legend() {
  const [open, setOpen] = useState(() => !prefersCompactLegend())
  const itemsId = useId()

  return (
    <div className={styles.legend} data-open={open || undefined}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={itemsId}
        title={open ? 'Hide the tree legend' : 'Show the tree legend'}
      >
        <Info size={13} aria-hidden="true" />
        <span>Legend</span>
        <ChevronDown
          size={12}
          className={styles.chevron}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <ul className={styles.items} id={itemsId}>
          {ITEMS.map((item) => (
            <li key={item.key} className={styles.item} data-kind={item.key}>
              <span className={styles.swatch} aria-hidden="true" />
              {item.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
