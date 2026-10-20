import { useId, useState } from 'react'
import {
  MAX_DEPTH_LIMIT,
  MIN_DEPTH_LIMIT,
} from '../../contract/defaults'
import DepthWarning from '../info/DepthWarning'
import styles from './DepthLimitField.module.css'

export interface DepthLimitFieldProps {
  value: number
  onChange: (depth: number) => void
  min?: number
  max?: number
}

/**
 * Numeric depth-limit field. The draft is committed on blur or Enter, so
 * partial/NaN input never reaches the store; values are clamped on commit.
 */
export default function DepthLimitField({
  value,
  onChange,
  min = MIN_DEPTH_LIMIT,
  max = MAX_DEPTH_LIMIT,
}: DepthLimitFieldProps) {
  const [draft, setDraft] = useState(() => String(value))
  const [focused, setFocused] = useState(false)
  const [lastValue, setLastValue] = useState(value)
  const inputId = useId()
  const suffixId = useId()

  // Keep the draft in sync with external changes while the field is idle.
  if (!focused && value !== lastValue) {
    setLastValue(value)
    setDraft(String(value))
  }

  const commit = () => {
    const parsed = Number.parseInt(draft, 10)
    if (!Number.isFinite(parsed)) {
      setDraft(String(value))
      return
    }
    const next = Math.min(max, Math.max(min, Math.round(parsed)))
    setDraft(String(next))
    if (next !== value) onChange(next)
  }

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        Depth limit
      </label>
      <div className={styles.control} data-focused={String(focused)}>
        <input
          id={inputId}
          className={styles.input}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={draft}
          aria-describedby={suffixId}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            commit()
          }}
          onChange={(event) => setDraft(event.target.value.replace(/[^\d]/g, ''))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              setDraft(String(value))
            }
          }}
        />
        <span id={suffixId} className={styles.suffix}>
          plies
        </span>
      </div>
      <DepthWarning depthLimit={value} />
    </div>
  )
}
