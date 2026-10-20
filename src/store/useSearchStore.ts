import { create } from 'zustand'
import type { SearchStoreApi } from '../contract/storeApi'
import type { SearchConfig, SearchSnapshot } from '../contract/types'
import type { ActionNarration } from '../contract/ui'
import {
  DEFAULT_DEPTH_LIMIT,
  DEFAULT_GOAL,
  DEFAULT_SPEED,
  DEFAULT_START,
  MAX_SPEED,
  MIN_SPEED,
} from '../contract/defaults'
import { createSearch, type SearchController } from '../engine/dfs'

export interface SearchStoreState extends SearchStoreApi {
  /** Narration for the most recent action, used by the step inspector. */
  lastAction: ActionNarration | null
}

const initialConfig: SearchConfig = {
  start: DEFAULT_START,
  goal: DEFAULT_GOAL,
  depthLimit: DEFAULT_DEPTH_LIMIT,
}

let controller: SearchController = createSearch(initialConfig)
let timer: ReturnType<typeof setTimeout> | null = null

const AUTOPLAY_BASE_MS = 650

function clearTimer() {
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
}

function scheduleTick() {
  clearTimer()
  const { autoplay } = useSearchStore.getState()
  if (!autoplay.running) return
  const delay = Math.max(50, Math.round(AUTOPLAY_BASE_MS / autoplay.speed))
  timer = setTimeout(() => {
    const state = useSearchStore.getState()
    if (!state.autoplay.running) return
    state.step()
    const after = useSearchStore.getState()
    if (!after.autoplay.running) return
    if (after.snapshot.result || after.snapshot.stack.length === 0) {
      after.setAutoplay(false)
      return
    }
    scheduleTick()
  }, delay)
}

export const useSearchStore = create<SearchStoreState>()((set, get) => ({
  snapshot: controller.getSnapshot(),
  lastAction: controller.getLastEvent(),
  autoplay: { running: false, speed: DEFAULT_SPEED },

  configure(config) {
    clearTimer()
    controller = createSearch(config)
    set({
      snapshot: controller.getSnapshot(),
      lastAction: controller.getLastEvent(),
      autoplay: { ...get().autoplay, running: false },
    })
  },

  step() {
    if (get().snapshot.result) {
      get().setAutoplay(false)
      return
    }
    const snapshot = controller.step()
    set({ snapshot, lastAction: controller.getLastEvent() })
    if (snapshot.result) get().setAutoplay(false)
  },

  undo() {
    get().setAutoplay(false)
    set({ snapshot: controller.undo(), lastAction: controller.getLastEvent() })
  },

  redo() {
    get().setAutoplay(false)
    set({ snapshot: controller.redo(), lastAction: controller.getLastEvent() })
  },

  reset() {
    clearTimer()
    set({
      snapshot: controller.reset(),
      lastAction: controller.getLastEvent(),
      autoplay: { ...get().autoplay, running: false },
    })
  },

  runToEnd() {
    clearTimer()
    set({
      snapshot: controller.runToEnd(),
      lastAction: controller.getLastEvent(),
      autoplay: { ...get().autoplay, running: false },
    })
  },

  setAutoplay(running) {
    if (running && get().snapshot.result) return
    set({ autoplay: { ...get().autoplay, running } })
    if (running) scheduleTick()
    else clearTimer()
  },

  setSpeed(speed) {
    const next = Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed))
    set({ autoplay: { ...get().autoplay, speed: next } })
    if (get().autoplay.running) scheduleTick()
  },
}))

/** Exposed for tests and for the integration page's derived flags. */
export function currentSnapshot(): SearchSnapshot {
  return useSearchStore.getState().snapshot
}
