import type { ReactNode } from 'react'
import styles from './ControlGroup.module.css'

export interface ControlGroupProps {
  label: string
  children: ReactNode
}

/** Visual/semantic grouping for related control-bar buttons. */
export default function ControlGroup({ label, children }: ControlGroupProps) {
  return (
    <div className={styles.group} role="group" aria-label={label}>
      {children}
    </div>
  )
}
