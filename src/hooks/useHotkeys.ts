import { useEffect, useRef } from 'react'

export interface HotkeyActions {
  step: () => void
  undo: () => void
  redo: () => void
  toggleAutoplay: () => void
  reset: () => void
  toggleSidebar: () => void
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    target.isContentEditable ||
    target.getAttribute('role') === 'textbox'
  )
}

/**
 * Global playback shortcuts:
 * Space = step, ← = undo, → = redo, A = autoplay, R = reset, [ = sidebar.
 */
export function useHotkeys(actions: HotkeyActions, enabled = true): void {
  const ref = useRef(actions)
  ref.current = actions

  useEffect(() => {
    if (!enabled) return
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      if (isEditableTarget(event.target)) return

      const key = event.key
      const action = ref.current
      switch (key) {
        case ' ':
        case 'Spacebar':
          event.preventDefault()
          action.step()
          break
        case 'ArrowLeft':
          event.preventDefault()
          action.undo()
          break
        case 'ArrowRight':
          event.preventDefault()
          action.redo()
          break
        case 'a':
        case 'A':
          event.preventDefault()
          action.toggleAutoplay()
          break
        case 'r':
        case 'R':
          event.preventDefault()
          action.reset()
          break
        case '[':
          event.preventDefault()
          action.toggleSidebar()
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled])
}
