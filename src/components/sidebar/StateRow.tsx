import { memo } from 'react'
import type { AriaAttributes, CSSProperties } from 'react'
import type { Status } from '../../contract/types'
import MiniBoard from './MiniBoard'
import styles from './StateRow.module.css'

export interface StateRowProps {
  id: number
  state: number
  depth: number
  status: Status
  isNext?: boolean
  order?: number
  highlighted?: boolean
  onClick?: () => void
  onHover?: () => void
  onLeave?: () => void
  style?: CSSProperties
  ariaAttributes?: AriaAttributes
}

function StateRow({
  id,
  state,
  depth,
  status,
  isNext = false,
  order,
  highlighted = false,
  onClick,
  onHover,
  onLeave,
  style,
  ariaAttributes,
}: StateRowProps) {
  return (
    <button
      type="button"
      className={styles.row}
      data-highlighted={highlighted || undefined}
      data-status={status}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onFocus={onHover}
      onBlur={onLeave}
      style={style}
      {...ariaAttributes}
      aria-label={`Node ${id}, depth ${depth}, ${status}${isNext ? ', next to pop' : ''}`}
    >
      <MiniBoard state={state} />
      <span className={styles.main}>
        <span className={styles.status} data-status={status}>
          {status}
        </span>
        <span className={styles.meta}>
          <span>depth {depth}</span>
          {order !== undefined ? <span>#{order}</span> : null}
        </span>
      </span>
      {isNext ? <span className={styles.next}>next</span> : <span className={styles.id}>#{id}</span>}
    </button>
  )
}

export default memo(StateRow)
