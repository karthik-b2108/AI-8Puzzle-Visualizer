import { create } from 'zustand'
import type { SearchSnapshot } from '../contract/types'
import type { TreeViewState } from '../contract/ui'

const initial = {
  hoveredId: null as number | null,
  selectedId: null as number | null,
  cameraTargetId: null as number | null,
}

export const useTreeViewStore = create<TreeViewState>()((set, get) => ({
  ...initial,

  setHovered: (id) => {
    if (get().hoveredId === id) return
    set({ hoveredId: id })
  },

  setSelected: (id) => {
    if (get().selectedId === id) return
    set({ selectedId: id })
  },

  focusNode: (id, snapshot: SearchSnapshot) => {
    if (!snapshot.nodes[id]) return
    set({ selectedId: id, cameraTargetId: id })
  },

  clearCameraTarget: () => {
    if (get().cameraTargetId === null) return
    set({ cameraTargetId: null })
  },

  reset: () => {
    set({
      hoveredId: null,
      selectedId: null,
      cameraTargetId: null,
    })
  },
}))
