import { useEffect, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import type { LearnSectionMeta } from './sections'
import styles from './Toc.module.css'

/** Height reserved for the sticky app header when computing the reading line. */
const HEADER_OFFSET = 76

interface TocProps {
  sections: readonly LearnSectionMeta[]
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Sticky table of contents. Uses buttons rather than `#id` anchors because the
 * app is rendered under a HashRouter, where a bare hash would replace the route.
 */
export default function Toc({ sections }: TocProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '')
  const [open, setOpen] = useState(false)
  const ids = useMemo(() => sections.map((section) => section.id), [sections])

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null)

    if (elements.length === 0) return

    // Graceful fallback for browsers without IntersectionObserver.
    if (typeof IntersectionObserver === 'undefined') {
      const update = () => {
        let current = ids[0] ?? ''
        for (const id of ids) {
          const element = document.getElementById(id)
          if (element && element.getBoundingClientRect().top <= HEADER_OFFSET + 24) {
            current = id
          }
        }
        setActiveId(current)
      }

      update()
      window.addEventListener('scroll', update, { passive: true })
      window.addEventListener('resize', update)
      return () => {
        window.removeEventListener('scroll', update)
        window.removeEventListener('resize', update)
      }
    }

    const visible = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        const next = ids.find((id) => visible.has(id))
        if (next) setActiveId(next)
      },
      { rootMargin: `-${HEADER_OFFSET}px 0px -60% 0px`, threshold: 0 },
    )

    for (const element of elements) observer.observe(element)
    return () => observer.disconnect()
  }, [ids])

  const goTo = (event: MouseEvent<HTMLButtonElement>, id: string) => {
    event.preventDefault()
    setActiveId(id)
    setOpen(false)

    const target = document.getElementById(id)
    if (!target || typeof target.scrollIntoView !== 'function') return

    target.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  return (
    <aside className={styles.toc}>
      <div className={styles.inner}>
        <button
          type="button"
          className={styles.toggle}
          aria-label="On this page"
          aria-expanded={open}
          aria-controls="learn-toc-list"
          onClick={() => setOpen((value) => !value)}
        >
          <span>On this page</span>
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={open ? styles.chevronOpen : styles.chevron}
          />
        </button>

        <p className={styles.heading} aria-hidden="true">
          On this page
        </p>

        <nav aria-label="Sections">
          <ol id="learn-toc-list" className={styles.list} data-open={open ? 'true' : 'false'}>
            {sections.map((section) => {
              const isActive = section.id === activeId
              return (
                <li key={section.id}>
                  <button
                    type="button"
                    className={isActive ? styles.linkActive : styles.link}
                    aria-current={isActive ? 'location' : undefined}
                    onClick={(event) => goTo(event, section.id)}
                  >
                    <span className={styles.number} aria-hidden="true">
                      {String(section.number).padStart(2, '0')}
                    </span>
                    <span className={styles.label}>{section.title}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>

        <Link to="/" className={styles.back}>
          <ArrowLeft size={14} aria-hidden="true" />
          Back to visualizer
        </Link>
      </div>
    </aside>
  )
}
