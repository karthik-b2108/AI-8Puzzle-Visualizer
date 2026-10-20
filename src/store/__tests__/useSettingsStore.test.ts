import { beforeEach, describe, expect, it } from 'vitest'
import { isSolvable } from '../../engine/solvable'
import { DEFAULT_GOAL, DEFAULT_START, MAX_DEPTH_LIMIT, MIN_DEPTH_LIMIT } from '../../contract/defaults'
import { scramble, useSettingsStore } from '../useSettingsStore'

beforeEach(() => {
  useSettingsStore.setState({
    start: DEFAULT_START,
    goal: DEFAULT_GOAL,
    depthLimit: 6,
    theme: 'light',
    sidebarOpen: true,
    followCamera: true,
  })
})

describe('useSettingsStore', () => {
  it('clamps the depth limit', () => {
    useSettingsStore.getState().setDepthLimit(0)
    expect(useSettingsStore.getState().depthLimit).toBe(MIN_DEPTH_LIMIT)
    useSettingsStore.getState().setDepthLimit(99)
    expect(useSettingsStore.getState().depthLimit).toBe(MAX_DEPTH_LIMIT)
    useSettingsStore.getState().setDepthLimit(7.6)
    expect(useSettingsStore.getState().depthLimit).toBe(8)
  })

  it('applies and persists the theme on the document', () => {
    useSettingsStore.getState().setTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    useSettingsStore.getState().setTheme('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('toggles the sidebar and camera follow', () => {
    const initial = useSettingsStore.getState().sidebarOpen
    useSettingsStore.getState().toggleSidebar()
    expect(useSettingsStore.getState().sidebarOpen).toBe(!initial)
    useSettingsStore.getState().setFollowCamera(false)
    expect(useSettingsStore.getState().followCamera).toBe(false)
  })

  it('randomizes to a solvable, non-trivial board', () => {
    for (let i = 0; i < 6; i += 1) {
      useSettingsStore.getState().randomizeStart()
      const { start, goal } = useSettingsStore.getState()
      expect(isSolvable(goal, start)).toBe(true)
      expect(start).not.toBe(goal)
    }
  })

  it('swaps and resets the boards', () => {
    useSettingsStore.getState().swapBoards()
    expect(useSettingsStore.getState().start).toBe(DEFAULT_GOAL)
    expect(useSettingsStore.getState().goal).toBe(DEFAULT_START)
    useSettingsStore.getState().resetBoards()
    expect(useSettingsStore.getState().start).toBe(DEFAULT_START)
    expect(useSettingsStore.getState().goal).toBe(DEFAULT_GOAL)
  })
})

describe('scramble', () => {
  it('stays solvable relative to the goal', () => {
    for (const random of [() => 0, () => 0.25, () => 0.5, () => 0.99]) {
      const board = scramble(DEFAULT_GOAL, 30, random)
      expect(isSolvable(DEFAULT_GOAL, board)).toBe(true)
    }
  })
})
