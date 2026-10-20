import type { ReactNode } from 'react'
import styles from './Section.module.css'

interface SectionProps {
  id: string
  number: number
  title: string
  eyebrow?: string
  children: ReactNode
}

/**
 * One numbered chapter of the explainer. The section carries the anchor id, and
 * `scroll-margin-top` keeps the heading clear of the sticky app header and ToC.
 */
export default function Section({ id, number, title, eyebrow, children }: SectionProps) {
  const headingId = `${id}-heading`

  return (
    <section id={id} className={styles.section} aria-labelledby={headingId}>
      <header className={styles.header}>
        <span className={styles.number} aria-hidden="true">
          {String(number).padStart(2, '0')}
        </span>
        <div className={styles.headingGroup}>
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          <h2 id={headingId} className={styles.title}>
            {title}
          </h2>
        </div>
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  )
}
