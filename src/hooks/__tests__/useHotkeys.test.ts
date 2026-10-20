import { describe, expect, it, vi } from 'vitest'
import { fireEvent, renderHook } from '@testing-library/react'
import { useHotkeys } from '../useHotkeys'

function setup(overrides: Partial<Parameters<typeof useHotkeys>[0]> = {}) {
  const actions = {
    step: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    toggleAutoplay: vi.fn(),
    reset: vi.fn(),
    toggleSidebar: vi.fn(),
    ...overrides,
  }
  renderHook(() => useHotkeys(actions))
  return actions
}

describe('useHotkeys', () => {
  it('maps the playback shortcuts', () => {
    const actions = setup()
    fireEvent.keyDown(window, { key: ' ' })
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'a' })
    fireEvent.keyDown(window, { key: 'R' })
    fireEvent.keyDown(window, { key: '[' })

    expect(actions.step).toHaveBeenCalledTimes(1)
    expect(actions.undo).toHaveBeenCalledTimes(1)
    expect(actions.redo).toHaveBeenCalledTimes(1)
    expect(actions.toggleAutoplay).toHaveBeenCalledTimes(1)
    expect(actions.reset).toHaveBeenCalledTimes(1)
    expect(actions.toggleSidebar).toHaveBeenCalledTimes(1)
  })

  it('ignores shortcuts while typing in an input', () => {
    const actions = setup()
    const input = document.createElement('input')
    document.body.appendChild(input)
    fireEvent.keyDown(input, { key: ' ' })
    expect(actions.step).not.toHaveBeenCalled()
    input.remove()
  })

  it('ignores shortcuts with modifier keys', () => {
    const actions = setup()
    fireEvent.keyDown(window, { key: 'a', ctrlKey: true })
    expect(actions.toggleAutoplay).not.toHaveBeenCalled()
  })
})
