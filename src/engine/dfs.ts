/**
 * Depth-first search engine for the 8-puzzle.
 *
 * The engine is a mutable controller that is cheap to advance and exposes
 * fresh snapshots for React. Every completed step pushes a record that can
 * invert it exactly, which powers undo/redo.
 */

import type {
  Metrics,
  Result,
  SearchConfig,
  SearchNode,
  SearchSnapshot,
  Status,
} from '../contract/types'
import { cloneMetrics, cloneResult, createMetrics, solutionResult } from './metrics'
import { neighbors } from './moves'

/** Safety cap for `runToEnd`; the reachable state space is only 181,440. */
export const MAX_STEPS = 1_000_000

export interface StepEvent {
  kind: 'step' | 'undo' | 'redo' | 'reset'
  poppedId: number | null
  /** Children pushed by the step. */
  pushed: number
  /** Neighbours skipped because they were the parent or already visited. */
  pruned: number
  /** Whether the popped state was newly visited. */
  visited: boolean
}

export interface SearchController {
  getSnapshot(): SearchSnapshot
  getLastEvent(): StepEvent | null
  step(): SearchSnapshot
  undo(): SearchSnapshot
  redo(): SearchSnapshot
  reset(): SearchSnapshot
  runToEnd(): SearchSnapshot
}

/**
 * Everything needed to invert a step. `prev*` values describe the engine
 * immediately before the step; `post*` values describe it immediately after.
 */
interface StepRecord {
  prevStack: number[]
  prevCurrentId: number | null
  prevParentOfCurrentId: number | null
  prevResult: Result | null
  prevMetrics: Metrics
  prevNextId: number
  prevVisitedLength: number
  /** Popped node's children before the step. */
  prevChildren: number[] | null

  poppedId: number | null
  poppedParentId: number | null
  poppedPrevStatus: Status | null
  newVisit: boolean
  pruned: number
  /** Created child nodes in U, D, L, R order. */
  createdNodes: SearchNode[]
  /** Child ids in stack-push order; the last element ends up on top. */
  pushedIds: number[]

  postPoppedStatus: Status | null
  postMetrics: Metrics
  postResult: Result | null
  postNextId: number
  event: StepEvent
}

const ROOT_ID = 0

function copyConfig(config: SearchConfig): SearchConfig {
  return {
    start: config.start,
    goal: config.goal,
    depthLimit: config.depthLimit,
  }
}

function createNode(
  id: number,
  state: number,
  parentId: number | null,
  depth: number,
  move: SearchNode['move'],
): SearchNode {
  return { id, state, parentId, depth, move, status: 'frontier', children: [] }
}

export function createSearch(config: SearchConfig): SearchController {
  const searchConfig = copyConfig(config)

  const nodes = new Map<number, SearchNode>()
  const visitedStates = new Set<number>()
  let visitedOrder: number[] = []
  let stack: number[] = []
  let currentId: number | null = null
  let parentOfCurrentId: number | null = null
  let metrics: Metrics = createMetrics()
  let result: Result | null = null
  let nextId = ROOT_ID + 1
  let undoStack: StepRecord[] = []
  let redoStack: StepRecord[] = []
  let lastEvent: StepEvent | null = null

  /** Root -> goal node ids, following parent links. */
  function buildPath(goalId: number): number[] {
    const path: number[] = []
    let cursor: number | null = goalId
    while (cursor !== null) {
      const node = nodes.get(cursor)
      if (!node) return []
      path.push(cursor)
      cursor = node.parentId
    }
    path.reverse()
    return path
  }

  /**
   * Advance the search by exactly one stack pop. Returns the record that can
   * invert the step. Callers decide whether to keep it (interactive step) or
   * discard it (headless run).
   */
  function executeStep(): StepRecord {
    const startedAt = performance.now()
    const prevMetrics = cloneMetrics(metrics)
    const prevStack = stack.slice()
    const prevCurrentId = currentId
    const prevParentOfCurrentId = parentOfCurrentId
    const prevResult = cloneResult(result)
    const prevNextId = nextId
    const prevVisitedLength = visitedOrder.length

    let poppedId: number | null = null
    let poppedParentId: number | null = null
    let poppedPrevStatus: Status | null = null
    let prevChildren: number[] | null = null
    let newVisit = false
    let pruned = 0
    const createdNodes: SearchNode[] = []
    const pushedIds: number[] = []
    let postPoppedStatus: Status | null = null

    if (stack.length === 0) {
      // Nothing left to explore: terminate. `result` was null before the step.
      result = solutionResult('not_found', null, metrics)
    } else {
      poppedId = stack[stack.length - 1]
      stack.pop()

      const node = nodes.get(poppedId)
      if (!node) throw new Error(`engine invariant broken: missing node ${poppedId}`)

      poppedParentId = node.parentId
      poppedPrevStatus = node.status
      prevChildren = [...node.children]
      currentId = poppedId
      parentOfCurrentId = node.parentId

      if (visitedStates.has(node.state)) {
        node.status = 'duplicate'
        postPoppedStatus = 'duplicate'
      } else {
        newVisit = true
        visitedStates.add(node.state)
        visitedOrder.push(node.state)
        metrics.explored += 1

        if (node.state === searchConfig.goal) {
          node.status = 'goal'
          postPoppedStatus = 'goal'
          result = solutionResult('found', buildPath(poppedId), metrics)
        } else if (node.depth < searchConfig.depthLimit) {
          node.status = 'visited'
          postPoppedStatus = 'visited'

          const parentState =
            node.parentId === null ? null : nodes.get(node.parentId)?.state ?? null

          for (const neighbor of neighbors(node.state)) {
            if (neighbor.state === parentState || visitedStates.has(neighbor.state)) {
              pruned += 1
              continue
            }

            const child = createNode(
              nextId,
              neighbor.state,
              poppedId,
              node.depth + 1,
              neighbor.move,
            )
            nextId += 1
            nodes.set(child.id, child)
            node.children.push(child.id)
            createdNodes.push(child)
            metrics.generated += 1
            if (child.depth > metrics.maxDepth) metrics.maxDepth = child.depth
          }

          // Push in reverse so the first neighbour (U) is popped first.
          for (let index = createdNodes.length - 1; index >= 0; index -= 1) {
            const childId = createdNodes[index].id
            pushedIds.push(childId)
            stack.push(childId)
          }
        } else {
          node.status = 'visited'
          postPoppedStatus = 'visited'
        }
      }
    }

    const dtMs = performance.now() - startedAt
    // Store `prev + dt` rather than subtracting later, so undo restores the
    // previous elapsed value bit-for-bit.
    metrics.elapsedMs = prevMetrics.elapsedMs + dtMs
    if (result !== null) result.metrics = cloneMetrics(metrics)

    const event: StepEvent = {
      kind: 'step',
      poppedId,
      pushed: pushedIds.length,
      pruned,
      visited: newVisit,
    }

    return {
      prevStack,
      prevCurrentId,
      prevParentOfCurrentId,
      prevResult,
      prevMetrics,
      prevNextId,
      prevVisitedLength,
      prevChildren,
      poppedId,
      poppedParentId,
      poppedPrevStatus,
      newVisit,
      pruned,
      createdNodes,
      pushedIds,
      postPoppedStatus,
      postMetrics: cloneMetrics(metrics),
      postResult: cloneResult(result),
      postNextId: nextId,
      event,
    }
  }

  /** Undo the mutations described by a record. */
  function revertRecord(record: StepRecord): void {
    for (const child of record.createdNodes) nodes.delete(child.id)

    if (record.poppedId !== null) {
      const node = nodes.get(record.poppedId)
      if (!node) throw new Error(`engine invariant broken: missing node ${record.poppedId}`)
      node.status = record.poppedPrevStatus ?? 'frontier'
      node.children = record.prevChildren ? [...record.prevChildren] : []
      if (record.newVisit) {
        visitedStates.delete(node.state)
        if (visitedOrder.length > record.prevVisitedLength) {
          visitedOrder.length = record.prevVisitedLength
        }
      }
    }

    stack = record.prevStack.slice()
    currentId = record.prevCurrentId
    parentOfCurrentId = record.prevParentOfCurrentId
    metrics = cloneMetrics(record.prevMetrics)
    result = cloneResult(record.prevResult)
    nextId = record.prevNextId
  }

  /** Replay the mutations described by a record, reusing the same node ids. */
  function applyRecord(record: StepRecord): void {
    for (const child of record.createdNodes) nodes.set(child.id, child)

    if (record.poppedId !== null) {
      // The stack was restored from `prevStack`, so the recorded node is on top.
      if (stack[stack.length - 1] === record.poppedId) stack.pop()
      const node = nodes.get(record.poppedId)
      if (!node) throw new Error(`engine invariant broken: missing node ${record.poppedId}`)
      currentId = record.poppedId
      parentOfCurrentId = record.poppedParentId
      node.status = record.postPoppedStatus ?? node.status
      node.children = [
        ...(record.prevChildren ?? []),
        ...record.createdNodes.map((child) => child.id),
      ]
      if (record.newVisit) {
        visitedStates.add(node.state)
        visitedOrder.push(node.state)
      }
    } else {
      currentId = null
      parentOfCurrentId = null
    }

    for (const id of record.pushedIds) stack.push(id)

    metrics = cloneMetrics(record.postMetrics)
    result = cloneResult(record.postResult)
    nextId = record.postNextId
  }

  function getSnapshot(): SearchSnapshot {
    const nodeCopies: Record<number, SearchNode> = {}
    for (const [id, node] of nodes) {
      nodeCopies[id] = {
        id: node.id,
        state: node.state,
        parentId: node.parentId,
        depth: node.depth,
        move: node.move,
        status: node.status,
        children: [...node.children],
      }
    }

    return {
      config: copyConfig(searchConfig),
      nodes: nodeCopies,
      stack: [...stack],
      visited: [...visitedOrder],
      currentId,
      parentOfCurrentId,
      metrics: cloneMetrics(metrics),
      result: cloneResult(result),
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
    }
  }

  function step(): SearchSnapshot {
    // Once a result exists stepping is a no-op and must not create history.
    if (result !== null) return getSnapshot()

    const record = executeStep()
    undoStack.push(record)
    redoStack = []
    lastEvent = { ...record.event }
    return getSnapshot()
  }

  function undo(): SearchSnapshot {
    const record = undoStack.pop()
    if (!record) return getSnapshot()

    revertRecord(record)
    redoStack.push(record)
    lastEvent = {
      kind: 'undo',
      poppedId: record.poppedId,
      pushed: 0,
      pruned: 0,
      visited: false,
    }
    return getSnapshot()
  }

  function redo(): SearchSnapshot {
    const record = redoStack.pop()
    if (!record) return getSnapshot()

    applyRecord(record)
    undoStack.push(record)
    lastEvent = { ...record.event, kind: 'redo' }
    return getSnapshot()
  }

  function reset(): SearchSnapshot {
    nodes.clear()
    nodes.set(ROOT_ID, createNode(ROOT_ID, searchConfig.start, null, 0, null))

    visitedStates.clear()
    visitedOrder = []
    stack = [ROOT_ID]
    currentId = null
    parentOfCurrentId = null
    metrics = createMetrics()
    result = null
    nextId = ROOT_ID + 1
    undoStack = []
    redoStack = []
    lastEvent = { kind: 'reset', poppedId: null, pushed: 0, pruned: 0, visited: false }

    return getSnapshot()
  }

  /**
   * Headless full run: no snapshots are produced inside the loop and undo/redo
   * history is discarded afterwards, so the engine keeps only the final state.
   */
  function runToEnd(): SearchSnapshot {
    let steps = 0
    while (result === null && steps < MAX_STEPS) {
      const record = executeStep()
      lastEvent = { ...record.event }
      steps += 1
    }

    if (result === null) {
      result = solutionResult('not_found', null, metrics)
    }

    undoStack = []
    redoStack = []
    return getSnapshot()
  }

  // Pristine initial state. `reset()` per-se should report a reset event, so
  // initialise through the same path and then clear the event.
  reset()
  lastEvent = null

  return {
    getSnapshot,
    getLastEvent: () => (lastEvent ? { ...lastEvent } : null),
    step,
    undo,
    redo,
    reset,
    runToEnd,
  }
}

export function step(search: SearchController): SearchSnapshot {
  return search.step()
}

export function undo(search: SearchController): SearchSnapshot {
  return search.undo()
}

export function redo(search: SearchController): SearchSnapshot {
  return search.redo()
}
