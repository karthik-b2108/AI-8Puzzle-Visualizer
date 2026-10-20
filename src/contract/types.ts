/**
 * FROZEN CONTRACT — do not change without a checkpoint.
 *
 * Every engine, store and UI track codes against these types.
 */

export type Status = 'frontier' | 'visited' | 'duplicate' | 'goal'
export type Move = 'U' | 'D' | 'L' | 'R' | null

export interface SearchNode {
  id: number
  /** 9-digit integer: digit y is the piece on square y; 9 is the blank. */
  state: number
  parentId: number | null
  depth: number
  /** Move that produced this node from its parent. */
  move: Move
  status: Status
  children: number[]
}

export interface SearchConfig {
  start: number
  goal: number
  depthLimit: number
}

export interface Metrics {
  /** Child nodes created. */
  generated: number
  /** Distinct states added to the visited set. */
  explored: number
  /** Deepest node reached. */
  maxDepth: number
  /** Engine time only (performance.now deltas). */
  elapsedMs: number
}

export interface Result {
  outcome: 'found' | 'not_found'
  /** Solution path length in moves. */
  moves: number | null
  /** Node ids, root -> goal. */
  path: number[] | null
  metrics: Metrics
}

export interface SearchSnapshot {
  config: SearchConfig
  nodes: Record<number, SearchNode>
  /** Frontier; the top of the stack is the last element. */
  stack: number[]
  /** Visited states in visit order (mirrors the Set). */
  visited: number[]
  currentId: number | null
  parentOfCurrentId: number | null
  metrics: Metrics
  result: Result | null
  canUndo: boolean
  canRedo: boolean
}
