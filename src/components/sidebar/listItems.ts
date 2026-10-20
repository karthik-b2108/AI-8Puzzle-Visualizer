import type { SearchNode, SearchSnapshot } from '../../contract/types'

export interface NodeListItem {
  id: number
  state: number
  depth: number
  status: SearchNode['status']
  /** Top of the frontier (the next node to pop). */
  isNext?: boolean
  /** 1-based visit order, for the explored list. */
  order?: number
}

/** Snapshot stack, top first. */
export function frontierItems(snapshot: SearchSnapshot): NodeListItem[] {
  const items: NodeListItem[] = []
  for (let index = snapshot.stack.length - 1; index >= 0; index -= 1) {
    const node = snapshot.nodes[snapshot.stack[index]]
    if (!node) continue
    items.push({
      id: node.id,
      state: node.state,
      depth: node.depth,
      status: node.status,
      isNext: index === snapshot.stack.length - 1,
    })
  }
  return items
}

/** Visited states in visit order, resolved back to their node. */
export function exploredItems(snapshot: SearchSnapshot): NodeListItem[] {
  const byState = new Map<number, SearchNode>()
  for (const node of Object.values(snapshot.nodes)) {
    if (node.status === 'visited' || node.status === 'goal') {
      byState.set(node.state, node)
    }
  }
  const items: NodeListItem[] = []
  snapshot.visited.forEach((state, index) => {
    const node = byState.get(state)
    if (!node) return
    items.push({
      id: node.id,
      state: node.state,
      depth: node.depth,
      status: node.status,
      order: index + 1,
    })
  })
  return items
}

export function paddedState(state: number): string {
  return String(state).padStart(9, '0')
}

/** Digits, the raw integer or the node id can all match the filter. */
export function matchesQuery(item: NodeListItem, query: string): boolean {
  const needle = query.trim().replace(/\s+/g, '')
  if (needle.length === 0) return true
  return (
    paddedState(item.state).includes(needle) ||
    String(item.state).includes(needle) ||
    String(item.id).includes(needle)
  )
}

export function filterItems(items: NodeListItem[], query: string): NodeListItem[] {
  if (query.trim().length === 0) return items
  return items.filter((item) => matchesQuery(item, query))
}
