import type { StatBadgeProps } from '../../contract/ui'
import styles from './StatBadge.module.css'

export default function StatBadge({ label, value, tone = 'neutral', icon }: StatBadgeProps) {
  return (
    <div className={styles.badge} data-tone={tone}>
      {icon ? <span className={styles.icon}>{icon}</span> : null}
      <span className={styles.value}>{value}</span>
      <span className={styles.label}>{label}</span>
    </div>
  )
}
