import { create } from 'zustand'
import type { SearchSnapshot } from '../contract/types'
import type { CollapseMode, TreeViewState } from '../contract/ui'
import {
  HARD_CAP,
  computeVisibility,
  findFinishedSubtreeRoots,
} from '../components/tree/collapse'

/**
 * Extra action used by the canvas to publish the automatically computed
 * collapsed set. It is deliberately not part of the frozen TreeViewState.
 */
export interface TreeViewStoreActions {
  setCollapsed: (ids: ReadonlySet<number>) => void
  /** Double-click on a badge: reveal as much of the subtree as the hard cap allows. */
  expandSubtree: (id: number, snapshot: SearchSnapshot) => void
}

export type TreeViewStore = TreeViewState & TreeViewStoreActions

const sameSet = (a: ReadonlySet<number>, b: ReadonlySet<number>): boolean => {
  if (a === b) return true
  if (a.size !== b.size) return false
  for (const id of b) if (!a.has(id)) return false
  return true
}

const parentPath = (
  snapshot: SearchSnapshot,
  id: number,
): number[] => {
  const path: number[] = []
  const seen = new Set<number>()
  let cursor = snapshot.nodes[id]?.parentId ?? null
  while (cursor !== null && cursor !== undefined && !seen.has(cursor)) {
    const node = snapshot.nodes[cursor]
    if (!node) break
    path.push(cursor)
    seen.add(cursor)
    cursor = node.parentId
  }
  return path
}

const subtreeIds = (snapshot: SearchSnapshot, id: number): number[] => {
  const ids: number[] = []
  const stack = [id]
  const seen = new Set<number>()
  while (stack.length > 0) {
    const cursor = stack.pop() as number
    if (seen.has(cursor)) continue
    seen.add(cursor)
    const node = snapshot.nodes[cursor]
    if (!node) continue
    ids.push(cursor)
    for (const childId of node.children) {
      if (snapshot.nodes[childId]) stack.push(childId)
    }
  }
  return ids
}

const initial = {
  collapsed: new Set<number>() as ReadonlySet<number>,
  manual: new Map<number, CollapseMode>() as ReadonlyMap<number, CollapseMode>,
  hoveredId: null as number | null,
  selectedId: null as number | null,
  autoCollapse: true,
  cameraTargetId: null as number | null,
}

export const useTreeViewStore = create<TreeViewStore>()((set, get) => ({
  ...initial,

  setHovered: (id) => {
    if (get().hoveredId === id) return
    set({ hoveredId: id })
  },

  setSelected: (id) => {
    if (get().selectedId === id) return
    set({ selectedId: id })
  },

  setCollapsed: (ids) => {
    if (sameSet(get().collapsed, ids)) return
    set({ collapsed: new Set(ids) })
  },

  toggleCollapsed: (id) => {
    // The root is always visible: collapsing it would hide the whole tree.
    if (id === 0) return
    const { collapsed, manual } = get()
    const shouldCollapse = !collapsed.has(id)
    const nextCollapsed = new Set(collapsed)
    const nextManual = new Map(manual)
    if (shouldCollapse) {
      nextCollapsed.add(id)
      nextManual.set(id, 'closed')
    } else {
      nextCollapsed.delete(id)
      nextManual.set(id, 'open')
    }
    set({ collapsed: nextCollapsed, manual: nextManual })
  },

  setManual: (id, mode) => {
    const { collapsed, manual } = get()
    if (id === 0 && mode === 'closed') return
    const alreadyManual = manual.get(id)
    const alreadyCollapsed = collapsed.has(id)
    if (mode === 'closed' && alreadyManual === 'closed' && alreadyCollapsed) return
    if (mode === 'open' && alreadyManual === 'open' && !alreadyCollapsed) return

    const nextManual = new Map(manual)
    nextManual.set(id, mode)
    const nextCollapsed = new Set(collapsed)
    if (mode === 'closed') nextCollapsed.add(id)
    else nextCollapsed.delete(id)
    set({ manual: nextManual, collapsed: nextCollapsed })
  },

  expandAll: () => {
    set({ collapsed: new Set<number>(), manual: new Map<number, CollapseMode>() })
  },

  collapseFinished: (snapshot) => {
    const { collapsed, manual } = get()
    const protectedIds = new Set<number>()

    const path = parentPath(snapshot, snapshot.currentId ?? 0)
    protectedIds.add(0)
    if (snapshot.currentId !== null) protectedIds.add(snapshot.currentId)
    for (const id of path) protectedIds.add(id)

    for (const [id, mode] of manual) {
      if (mode === 'open') protectedIds.add(id)
    }

    const roots = findFinishedSubtreeRoots(snapshot, {
      minDepth: 3,
      protectedIds,
    })
    if (roots.length === 0) return

    const nextCollapsed = new Set(collapsed)
    const nextManual = new Map(manual)
    let changed = false
    for (const id of roots) {
      if (nextManual.get(id) !== 'closed') {
        nextManual.set(id, 'closed')
        changed = true
      }
      if (!nextCollapsed.has(id)) {
        nextCollapsed.add(id)
        changed = true
      }
    }
    if (changed) set({ collapsed: nextCollapsed, manual: nextManual })
  },

  setAutoCollapse: (on) => {
    if (get().autoCollapse === on) return
    if (!on) {
      // Drop automatic collapses immediately; manual closes survive.
      const { collapsed, manual } = get()
      const next = new Set<number>()
      for (const id of collapsed) if (manual.get(id) === 'closed') next.add(id)
      set({ autoCollapse: false, collapsed: next })
      return
    }
    set({ autoCollapse: true })
  },

  expandAncestors: (id, snapshot) => {
    if (!snapshot.nodes[id]) return
    const { collapsed, manual } = get()
    const nextCollapsed = new Set(collapsed)
    const nextManual = new Map(manual)
    let changed = false
    // Mark every ancestor open. A focus request is an explicit "keep this path
    // visible" action, and this also survives a not-yet-synced collapsed set.
    for (const ancestorId of parentPath(snapshot, id)) {
      if (ancestorId === 0) continue
      if (nextCollapsed.delete(ancestorId)) changed = true
      if (nextManual.get(ancestorId) !== 'open') {
        nextManual.set(ancestorId, 'open')
        changed = true
      }
    }
    if (changed) set({ collapsed: nextCollapsed, manual: nextManual })
  },

  focusNode: (id, snapshot) => {
    if (!snapshot.nodes[id]) return
    get().expandAncestors(id, snapshot)
    set({ selectedId: id, cameraTargetId: id })
  },

  expandSubtree: (id, snapshot) => {
    if (!snapshot.nodes[id]) return
    const { collapsed, manual, autoCollapse } = get()
    const current = computeVisibility(snapshot, manual, autoCollapse)

    let hiddenDescendants = 0
    for (const descendantId of subtreeIds(snapshot, id)) {
      if (descendantId !== id && !current.visible.has(descendantId)) {
        hiddenDescendants += 1
      }
    }

    // Auto-collapse keeps the tree within VISIBLE_CAP on its own. Without it,
    // a full expansion must still respect the hard ceiling.
    if (!autoCollapse && current.visible.size + hiddenDescendants > HARD_CAP) {
      get().setManual(id, 'open')
      return
    }

    const nextCollapsed = new Set(collapsed)
    const nextManual = new Map(manual)
    for (const descendantId of subtreeIds(snapshot, id)) {
      nextCollapsed.delete(descendantId)
      if (descendantId === id) nextManual.set(descendantId, 'open')
      else nextManual.delete(descendantId)
    }
    set({ collapsed: nextCollapsed, manual: nextManual })
  },

  clearCameraTarget: () => {
    if (get().cameraTargetId === null) return
    set({ cameraTargetId: null })
  },

  reset: () => {
    set({
      collapsed: new Set<number>(),
      manual: new Map<number, CollapseMode>(),
      hoveredId: null,
      selectedId: null,
      autoCollapse: true,
      cameraTargetId: null,
    })
  },
}))
