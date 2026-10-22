import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { LearnSectionMeta } from './sections'
import styles from './Toc.module.css'

gsap.registerPlugin(ScrollTrigger)

/** Height reserved for the sticky app header when computing the reading line. */
const HEADER_OFFSET = 76
/** Fraction of the viewport where the reading line sits. */
const FOCUS_LINE = 0.38
/** Fraction of the viewport over which focus hands off between sections. */
const FOCUS_FADE = 0.32

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
 * Sticky table of contents shaped as a vertical timeline. Buttons rather than
 * `#id` anchors are used because the app renders under a HashRouter, where a
 * bare hash would replace the route.
 *
 * GSAP ScrollTrigger drives a per-section focus value: the section crossing the
 * reading line is elevated, and neighbouring labels/markers are displaced by
 * the expansion. The value is interpolated continuously from scroll progress.
 */
export default function Toc({ sections }: TocProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '')
  const [open, setOpen] = useState(false)
  const listRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    const list = listRef.current
    if (!list) return

    const entries = Array.from(list.querySelectorAll<HTMLElement>('[data-toc-item]')).flatMap(
      (item) => {
        const id = item.dataset.sectionId ?? ''
        const section = document.getElementById(id)
        return section ? [{ id, item, section }] : []
      },
    )
    if (entries.length === 0) return

    const setFocus = (item: HTMLElement, focus: number) => {
      item.style.setProperty('--toc-focus', focus.toFixed(4))
    }

    if (prefersReducedMotion()) {
      for (const entry of entries) setFocus(entry.item, 0)

      const update = () => {
        let current = entries[0]?.id ?? ''
        for (const entry of entries) {
          if (entry.section.getBoundingClientRect().top <= HEADER_OFFSET + 24) current = entry.id
        }
        setActiveId(current)
        for (const entry of entries) {
          setFocus(entry.item, entry.id === current ? 1 : 0)
        }
      }

      update()
      window.addEventListener('scroll', update, { passive: true })
      window.addEventListener('resize', update)
      return () => {
        window.removeEventListener('scroll', update)
        window.removeEventListener('resize', update)
      }
    }

    const update = () => {
      const line = window.innerHeight * FOCUS_LINE
      const fade = Math.max(window.innerHeight * FOCUS_FADE, 140)
      let bestId = entries[0]?.id ?? ''
      let bestFocus = -1

      for (const entry of entries) {
        const rect = entry.section.getBoundingClientRect()
        let focus = 1
        if (line < rect.top) focus = 1 - (rect.top - line) / fade
        else if (line > rect.bottom) focus = 1 - (line - rect.bottom) / fade

        focus = Math.min(1, Math.max(0, focus))
        setFocus(entry.item, focus)

        if (focus > bestFocus) {
          bestFocus = focus
          bestId = entry.id
        }
      }

      if (bestId) {
        setActiveId((current) => (current === bestId ? current : bestId))
      }
    }

    const trigger = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: update,
      onRefresh: update,
    })

    update()
    const refreshFrame = window.requestAnimationFrame(() => ScrollTrigger.refresh())

    return () => {
      window.cancelAnimationFrame(refreshFrame)
      trigger.kill()
    }
  }, [sections])

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
          <ol
            id="learn-toc-list"
            ref={listRef}
            className={styles.list}
            data-open={open ? 'true' : 'false'}
          >
            {sections.map((section) => {
              const isActive = section.id === activeId
              return (
                <li
                  key={section.id}
                  className={styles.item}
                  data-toc-item
                  data-section-id={section.id}
                >
                  <button
                    type="button"
                    className={isActive ? styles.linkActive : styles.link}
                    aria-current={isActive ? 'location' : undefined}
                    onClick={(event) => goTo(event, section.id)}
                  >
                    <span className={styles.markerCell} aria-hidden="true">
                      <span className={styles.marker} />
                    </span>
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
      </div>
    </aside>
  )
}
