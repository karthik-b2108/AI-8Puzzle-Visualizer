/**
 * Subtree collapsing rules (implementation plan §6).
 *
 * The whole module is pure: it indexes a snapshot once, then answers visibility,
 * hidden-count and finished-subtree questions in O(n) or O(n log n) time. No
 * React and no mutation of the input snapshot.
 */

import type { SearchSnapshot, Status } from '../../contract/types'

/** Automatic collapsing starts once more than this many nodes are visible. */
export const VISIBLE_CAP = 300

/** Hard ceiling that even aggressive automatic collapsing must respect. */
export const HARD_CAP = 1500

export interface HiddenCounts {
  total: number
  byStatus: Record<Status, number>
}

export interface VisibilityResult {
  /** Node ids that are rendered. Always contains the root when it exists. */
  visible: ReadonlySet<number>
  /** Visible ids that are treated as leaves (manual or automatic collapse). */
  collapsed: ReadonlySet<number>
  /** Collapsed id -> descendant counts. Includes collapsed leaves (total 0). */
  hidden: ReadonlyMap<number, HiddenCounts>
}

const STATUS_INDEX: Record<Status, number> = {
  frontier: 0,
  visited: 1,
  duplicate: 2,
  goal: 3,
}

interface TreeIndex {
  nodes: SearchSnapshot['nodes']
  maxId: number
  /** Reachable ids in pre-order (root first). */
  order: number[]
  /** Compressed child lists: children of id are flat[offset[id]..offset[id + 1]). */
  offset: Int32Array
  flat: Int32Array
  /** Number of nodes in the subtree, including the node itself. */
  size: Int32Array
  depth: Int32Array
  /** 1 when the subtree (including the node) has a frontier or duplicate node. */
  hasLive: Uint8Array
  /** Subtree counts per status, including the node itself. */
  counts: [Int32Array, Int32Array, Int32Array, Int32Array]
}

function emptyIndex(): TreeIndex {
  const empty = new Int32Array(0)
  return {
    nodes: {},
    maxId: 0,
    order: [],
    offset: new Int32Array(1),
    flat: empty,
    size: empty,
    depth: empty,
    hasLive: new Uint8Array(0),
    counts: [empty, empty, empty, empty],
  }
}

function buildIndex(snapshot: SearchSnapshot): TreeIndex {
  const nodes = snapshot.nodes
  const root = nodes?.[0]
  if (!root) return emptyIndex()

  const ids = Object.keys(nodes)
    .map(Number)
    .filter((id) => Number.isInteger(id) && id >= 0)
  let maxId = 0
  for (const id of ids) if (id > maxId) maxId = id

  const width = maxId + 1
  const childCount = new Int32Array(width)
  for (const id of ids) {
    const node = nodes[id]
    for (const childId of node.children) {
      if (childId >= 0 && childId <= maxId && nodes[childId]) childCount[id] += 1
    }
  }

  const offset = new Int32Array(width + 1)
  for (let id = 0; id <= maxId; id += 1) offset[id + 1] = offset[id] + childCount[id]
  const flat = new Int32Array(offset[maxId + 1])
  const cursor = offset.slice(0, width)
  for (const id of ids) {
    const node = nodes[id]
    for (const childId of node.children) {
      if (childId >= 0 && childId <= maxId && nodes[childId]) {
        flat[cursor[id]] = childId
        cursor[id] += 1
      }
    }
  }

  // Pre-order from the root. Ids not reachable from the root are ignored.
  const order: number[] = []
  const stack: number[] = [0]
  const started = new Uint8Array(width)
  while (stack.length > 0) {
    const id = stack.pop() as number
    if (started[id]) continue
    started[id] = 1
    order.push(id)
    for (let i = offset[id + 1] - 1; i >= offset[id]; i -= 1) {
      const childId = flat[i]
      if (!started[childId]) stack.push(childId)
    }
  }

  const size = new Int32Array(width)
  const depth = new Int32Array(width)
  const hasLive = new Uint8Array(width)
  const counts: TreeIndex['counts'] = [
    new Int32Array(width),
    new Int32Array(width),
    new Int32Array(width),
    new Int32Array(width),
  ]

  // Reverse pre-order is a valid post-order: children are always after their parent.
  for (let i = order.length - 1; i >= 0; i -= 1) {
    const id = order[i]
    const node = nodes[id]
    size[id] += 1
    depth[id] = node.depth
    counts[STATUS_INDEX[node.status] ?? STATUS_INDEX.visited][id] += 1
    hasLive[id] =
      node.status === 'frontier' || node.status === 'duplicate' ? 1 : 0
    for (let j = offset[id]; j < offset[id + 1]; j += 1) {
      const childId = flat[j]
      size[id] += size[childId]
      counts[0][id] += counts[0][childId]
      counts[1][id] += counts[1][childId]
      counts[2][id] += counts[2][childId]
      counts[3][id] += counts[3][childId]
      if (hasLive[childId]) hasLive[id] = 1
    }
  }

  return { nodes, maxId, order, offset, flat, size, depth, hasLive, counts }
}

function childrenOf(index: TreeIndex, id: number, into: number[]): void {
  into.length = 0
  for (let i = index.offset[id]; i < index.offset[id + 1]; i += 1) {
    into.push(index.flat[i])
  }
}

function parentOf(index: TreeIndex, id: number): number | null {
  const node = index.nodes[id]
  if (!node) return null
  const parentId = node.parentId
  if (parentId === null || parentId === undefined) return null
  return index.nodes[parentId] ? parentId : null
}

/** Ids on the root -> current path, including the root. */
function currentPath(index: TreeIndex, currentId: number | null): Set<number> {
  const path = new Set<number>()
  path.add(0)
  let cursor = currentId
  while (cursor !== null && cursor !== undefined) {
    if (!index.nodes[cursor] || path.has(cursor)) break
    path.add(cursor)
    cursor = parentOf(index, cursor)
  }
  return path
}

function hiddenCounts(index: TreeIndex, id: number): HiddenCounts {
  const node = index.nodes[id]
  const counts = index.counts
  const byStatus: Record<Status, number> = {
    frontier: counts[0][id],
    visited: counts[1][id],
    duplicate: counts[2][id],
    goal: counts[3][id],
  }
  if (node) byStatus[node.status] -= 1
  return {
    total: Math.max(0, index.size[id] - 1),
    byStatus,
  }
}

/**
 * True when a subtree contains no frontier and no duplicate node, i.e. the
 * search is done with it (plan §6 "finished"). The node itself counts as part
 * of its subtree.
 */
export function isFinishedSubtree(snapshot: SearchSnapshot, id: number): boolean {
  const start = snapshot.nodes?.[id]
  if (!start) return false
  const stack: number[] = [id]
  const seen = new Set<number>()
  while (stack.length > 0) {
    const cursor = stack.pop() as number
    if (seen.has(cursor)) continue
    seen.add(cursor)
    const node = snapshot.nodes[cursor]
    if (!node) continue
    if (node.status === 'frontier' || node.status === 'duplicate') return false
    for (const childId of node.children) {
      if (snapshot.nodes[childId] && !seen.has(childId)) stack.push(childId)
    }
  }
  return true
}

export interface FinishedSubtreeOptions {
  /** Minimum depth of a returned root. Defaults to 3. */
  minDepth?: number
  /**
   * Nodes that may not be hidden. A subtree containing any protected id is not
   * returned, but its children are still inspected so off-path finished
   * branches can collapse.
   */
  protectedIds?: ReadonlySet<number>
}

/**
 * Top-down roots of maximal finished subtrees. Collapsing every returned id
 * hides the complete finished region without touching protected nodes.
 * Single pass over the tree after one O(n) post-order.
 */
export function findFinishedSubtreeRoots(
  snapshot: SearchSnapshot,
  options: FinishedSubtreeOptions = {},
): number[] {
  const index = buildIndex(snapshot)
  if (index.order.length === 0) return []
  const minDepth = options.minDepth ?? 3
  const protectedIds = options.protectedIds ?? new Set<number>()

  const containsProtected = new Uint8Array(index.maxId + 1)
  for (let i = index.order.length - 1; i >= 0; i -= 1) {
    const id = index.order[i]
    let flag = protectedIds.has(id) ? 1 : 0
    for (let j = index.offset[id]; j < index.offset[id + 1] && flag === 0; j += 1) {
      if (containsProtected[index.flat[j]]) flag = 1
    }
    containsProtected[id] = flag
  }

  const roots: number[] = []
  const stack: number[] = [0]
  while (stack.length > 0) {
    const id = stack.pop() as number
    if (id !== 0 && index.hasLive[id] === 0 && index.size[id] > 1) {
      if (index.depth[id] >= minDepth && containsProtected[id] === 0) {
        roots.push(id)
        continue
      }
    }
    for (let i = index.offset[id]; i < index.offset[id + 1]; i += 1) {
      stack.push(index.flat[i])
    }
  }
  return roots
}

function compareLargest(a: number, b: number, size: Int32Array, depth: Int32Array): number {
  return size[b] - size[a] || depth[b] - depth[a]
}

function compareDeepest(a: number, b: number, size: Int32Array, depth: Int32Array): number {
  return depth[b] - depth[a] || size[b] - size[a]
}

/**
 * Compute the effective visible set, collapsed set and hidden descendant
 * counts for a snapshot.
 *
 * Manual overrides always win. Automatic collapsing only runs when
 * `autoCollapse` is true and only touches finished subtrees. The current path
 * and every subtree containing a frontier (or, to keep pruned nodes visible,
 * a duplicate) is protected.
 */
export function computeVisibility(
  snapshot: SearchSnapshot,
  manual: ReadonlyMap<number, 'open' | 'closed'>,
  autoCollapse: boolean,
): VisibilityResult {
  const index = buildIndex(snapshot)
  if (index.order.length === 0) {
    return { visible: new Set(), collapsed: new Set(), hidden: new Map() }
  }

  const width = index.maxId + 1
  const manualOpen = new Uint8Array(width)
  const manualClosed = new Uint8Array(width)
  for (const [id, mode] of manual) {
    if (!Number.isInteger(id) || id < 0 || id >= width) continue
    if (!index.nodes[id]) continue
    if (mode === 'open') manualOpen[id] = 1
    else manualClosed[id] = 1
  }

  // Nodes hidden because an ancestor is manually closed.
  const hiddenByManual = new Uint8Array(width)
  // A manual open override protects the whole subtree from automatic collapse.
  const subtreeOpen = new Uint8Array(width)
  // Visible size of each subtree under the manual overrides only.
  const manualVisibleSize = new Int32Array(width)
  const childBuffer: number[] = []

  for (const id of index.order) {
    const parent = id === 0 ? null : parentOf(index, id)
    if (parent !== null && (manualClosed[parent] || hiddenByManual[parent])) {
      hiddenByManual[id] = 1
    }
  }

  for (let i = index.order.length - 1; i >= 0; i -= 1) {
    const id = index.order[i]
    subtreeOpen[id] = manualOpen[id]
    let visible = id !== 0 && manualClosed[id] ? 0 : 1
    childrenOf(index, id, childBuffer)
    for (const childId of childBuffer) {
      if (subtreeOpen[childId]) subtreeOpen[id] = 1
      visible += manualVisibleSize[childId]
    }
    manualVisibleSize[id] = visible
  }

  const pathSet = currentPath(index, snapshot.currentId)
  const baselineVisible = manualVisibleSize[0]

  const selected = new Set<number>()
  const subtreeHasSelected = new Uint8Array(width)

  const isUnderSelected = (id: number): boolean => {
    let parent = parentOf(index, id)
    while (parent !== null) {
      if (selected.has(parent)) return true
      parent = parentOf(index, parent)
    }
    return false
  }

  const select = (id: number): void => {
    selected.add(id)
    let parent = parentOf(index, id)
    while (parent !== null) {
      subtreeHasSelected[parent] = 1
      parent = parentOf(index, parent)
    }
  }

  const canSelect = (id: number): boolean =>
    !isUnderSelected(id) && subtreeHasSelected[id] === 0

  const isDescendantOf = (ancestorId: number, id: number): boolean => {
    let parent = parentOf(index, id)
    while (parent !== null) {
      if (parent === ancestorId) return true
      parent = parentOf(index, parent)
    }
    return false
  }

  const rebuildSelectedFlags = (): void => {
    subtreeHasSelected.fill(0)
    for (const selectedId of selected) {
      let parent = parentOf(index, selectedId)
      while (parent !== null) {
        subtreeHasSelected[parent] = 1
        parent = parentOf(index, parent)
      }
    }
  }

  /** Replace already-selected descendants so a shallow subtree can collapse. */
  const selectReplacing = (id: number): void => {
    for (const selectedId of [...selected]) {
      if (!isDescendantOf(id, selectedId)) continue
      selected.delete(selectedId)
      visibleCount += manualVisibleSize[selectedId] - 1
    }
    rebuildSelectedFlags()
    select(id)
    visibleCount -= manualVisibleSize[id] - 1
  }

  let visibleCount = baselineVisible
  if (autoCollapse) {
    const candidates: number[] = []
    for (const id of index.order) {
      if (id === 0) continue
      if (index.depth[id] < 1) continue
      if (index.hasLive[id] !== 0) continue
      if (manualClosed[id] || hiddenByManual[id]) continue
      if (subtreeOpen[id]) continue
      if (pathSet.has(id)) continue
      if (manualVisibleSize[id] <= 1) continue
      candidates.push(id)
    }

    // Largest finished subtrees first: collapsing a whole finished region beats
    // hiding hundreds of individual leaves. Ties go to the deeper subtree.
    candidates.sort((a, b) => compareLargest(a, b, manualVisibleSize, index.depth))
    for (const id of candidates) {
      if (visibleCount <= VISIBLE_CAP) break
      if (index.depth[id] < 3) continue
      if (!canSelect(id)) continue
      select(id)
      visibleCount -= manualVisibleSize[id] - 1
    }

    if (visibleCount > HARD_CAP) {
      const shallow = candidates.filter((id) => index.depth[id] < 3)
      shallow.sort((a, b) => compareDeepest(a, b, manualVisibleSize, index.depth))
      for (const id of shallow) {
        if (visibleCount <= HARD_CAP) break
        if (isUnderSelected(id)) continue
        // A shallow candidate may contain subtrees chosen in the first pass;
        // replace them so the final collapsed set stays free of hidden ids.
        selectReplacing(id)
      }
    }
  }

  // Walk the visible tree: collapsed nodes are rendered as leaves.
  const visible = new Set<number>()
  const collapsed = new Set<number>()
  const hidden = new Map<number, HiddenCounts>()
  const walk: number[] = [0]
  while (walk.length > 0) {
    const id = walk.pop() as number
    if (!index.nodes[id]) continue
    visible.add(id)

    const closedByManual = id !== 0 && manualClosed[id] === 1
    const closedByAuto = selected.has(id) && manualOpen[id] === 0
    if (closedByManual || closedByAuto) {
      collapsed.add(id)
      hidden.set(id, hiddenCounts(index, id))
      continue
    }

    childrenOf(index, id, childBuffer)
    for (let i = childBuffer.length - 1; i >= 0; i -= 1) {
      walk.push(childBuffer[i])
    }
  }

  return { visible, collapsed, hidden }
}
