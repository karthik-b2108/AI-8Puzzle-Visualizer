import { useLayoutEffect } from 'react'
import type { RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Scroll-linked motion for the Learn page:
 *
 * - every section heading rises into place while fading in;
 * - every section body fades in;
 * - a fixed reading-progress bar scrubs from 0% to 100% across the document.
 *
 * The work is scoped with `gsap.context` so StrictMode double-mounts and route
 * changes fully revert the inline styles and ScrollTriggers.
 */
export function useLearnMotion(rootRef: RefObject<HTMLElement>) {
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const context = gsap.context(() => {
      const progress = root.querySelector<HTMLElement>('[data-reading-progress]')
      if (progress) {
        gsap.fromTo(
          progress,
          { width: '0%' },
          {
            width: '100%',
            ease: 'none',
            scrollTrigger: { start: 0, end: 'max', scrub: true },
          },
        )
      }

      if (reduced) return

      const headings = gsap.utils.toArray<HTMLElement>('[data-motion="heading"]', root)
      for (const heading of headings) {
        gsap.from(heading, {
          y: 20,
          opacity: 0,
          duration: 0.65,
          ease: 'power2.out',
          scrollTrigger: { trigger: heading, start: 'top 88%', once: true },
        })
      }

      const bodies = gsap.utils.toArray<HTMLElement>('[data-motion="body"]', root)
      for (const body of bodies) {
        gsap.from(body, {
          y: 10,
          opacity: 0,
          duration: 1.0,
          ease: 'power2.out',
          scrollTrigger: { trigger: body, start: 'top 92%', once: true },
        })
      }
    }, root)

    const frame = window.requestAnimationFrame(() => ScrollTrigger.refresh())

    return () => {
      window.cancelAnimationFrame(frame)
      context.revert()
    }
  }, [rootRef])
}
