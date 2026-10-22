import type { ReactNode } from 'react'
import styles from './Callout.module.css'

type CalloutTone = 'note' | 'insight' | 'warning'

interface CalloutProps {
  title: string
  tone?: CalloutTone
  children: ReactNode
}

const TONE_LABEL: Record<CalloutTone, string> = {
  note: 'Note',
  insight: 'Key idea',
  warning: 'Caution',
}

/** A quiet aside for definitions, key ideas and pitfalls. */
export default function Callout({ title, tone = 'note', children }: CalloutProps) {
  return (
    <aside className={styles.callout} data-tone={tone}>
      <p className={styles.title}>
        <span className={styles.badge}>{TONE_LABEL[tone]}</span>
        {title}
      </p>
      <div className={styles.body}>{children}</div>
    </aside>
  )
}
