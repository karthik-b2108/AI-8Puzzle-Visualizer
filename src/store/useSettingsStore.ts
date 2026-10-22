import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Theme } from '../contract/ui'
import {
  DEFAULT_DEPTH_LIMIT,
  DEFAULT_GOAL,
  DEFAULT_SPEED,
  DEFAULT_START,
  MAX_DEPTH_LIMIT,
  MAX_SPEED,
  MIN_DEPTH_LIMIT,
  MIN_SPEED,
} from '../contract/defaults'
import { applyMove, neighbors } from '../engine/moves'

export interface SettingsState {
  start: number
  goal: number
  depthLimit: number
  speed: number
  theme: Theme
  sidebarOpen: boolean
  setStart: (state: number) => void
  setGoal: (state: number) => void
  setDepthLimit: (depth: number) => void
  setSpeed: (speed: number) => void
  setTheme: (theme: Theme) => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  randomizeStart: () => void
  swapBoards: () => void
  resetBoards: () => void
}

/** Random walk away from `origin`, never immediately reversing the previous move. */
export function scramble(origin: number, steps = 24, random: () => number = Math.random): number {
  let state = origin
  let previous: number | null = null
  for (let i = 0; i < steps; i += 1) {
    const candidates = neighbors(state).filter((neighbor) => neighbor.state !== previous)
    if (candidates.length === 0) break
    const choice = candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))]
    previous = state
    state = choice.state
  }
  return state
}

const initialTheme: Theme =
  typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark'
    ? 'dark'
    : 'light'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function applyTheme(theme: Theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme
  }
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      start: DEFAULT_START,
      goal: DEFAULT_GOAL,
      depthLimit: DEFAULT_DEPTH_LIMIT,
      speed: DEFAULT_SPEED,
      theme: initialTheme,
      sidebarOpen: true,

      setStart: (start) => set({ start }),
      setGoal: (goal) => set({ goal }),
      setDepthLimit: (depth) =>
        set({ depthLimit: clamp(Math.round(depth), MIN_DEPTH_LIMIT, MAX_DEPTH_LIMIT) }),
      setSpeed: (speed) => set({ speed: clamp(speed, MIN_SPEED, MAX_SPEED) }),
      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme })
      },
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),

      randomizeStart: () => {
        const { start, goal } = get()
        let next = scramble(goal, 20 + Math.floor(Math.random() * 10))
        for (let attempt = 0; attempt < 8 && (next === goal || next === start); attempt += 1) {
          next = scramble(goal, 20 + Math.floor(Math.random() * 10))
        }
        if (next === goal) next = applyMove(goal, 'U')
        set({ start: next })
      },

      swapBoards: () => set({ start: get().goal, goal: get().start }),
      resetBoards: () => set({ start: DEFAULT_START, goal: DEFAULT_GOAL }),
    }),
    {
      name: 'dfs-settings',
      version: 1,
      partialize: (state) => ({
        depthLimit: state.depthLimit,
        speed: state.speed,
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyTheme(state.theme)
      },
    },
  ),
)
