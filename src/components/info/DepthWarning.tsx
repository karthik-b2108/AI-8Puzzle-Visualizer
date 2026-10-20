import { TriangleAlert } from 'lucide-react'
import { DEPTH_WARNING_THRESHOLD } from '../../contract/defaults'
import styles from './DepthWarning.module.css'

export interface DepthWarningProps {
  depthLimit: number
}

/** Non-blocking warning above the risky depth limit (default: 12 plies). */
export default function DepthWarning({ depthLimit }: DepthWarningProps) {
  if (depthLimit <= DEPTH_WARNING_THRESHOLD) return null

  return (
    <div className={styles.warning} role="status" aria-live="polite">
      <span className={styles.icon} aria-hidden="true">
        <TriangleAlert />
      </span>
      <p className={styles.text}>
        Depth {depthLimit} will generate very large trees and may be slow.
      </p>
    </div>
  )
}
