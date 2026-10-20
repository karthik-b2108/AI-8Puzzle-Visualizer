/** Pure counters, result construction and solution-path helpers. */

import type { Metrics, Result, SearchNode } from '../contract/types'

/**
 * Fresh counters. The root node counts as generated from the start so that
 * `generated >= explored` holds before the first step as well.
 */
export function createMetrics(): Metrics {
  return { generated: 1, explored: 0, maxDepth: 0, elapsedMs: 0 }
}

export function cloneMetrics(metrics: Metrics): Metrics {
  return {
    generated: metrics.generated,
    explored: metrics.explored,
    maxDepth: metrics.maxDepth,
    elapsedMs: metrics.elapsedMs,
  }
}

export function cloneResult(result: Result | null): Result | null {
  if (!result) return null
  return {
    outcome: result.outcome,
    moves: result.moves,
    path: result.path ? [...result.path] : null,
    metrics: cloneMetrics(result.metrics),
  }
}

/** Walk parent links from the goal back to the root. */
export function buildSolutionPath(
  nodes: Readonly<Record<number, SearchNode>>,
  goalId: number,
): number[] {
  const path: number[] = []
  const seen = new Set<number>()
  let cursor: number | null = goalId

  while (cursor !== null) {
    const node: SearchNode | undefined = nodes[cursor]
    if (!node || seen.has(cursor)) return []
    seen.add(cursor)
    path.push(cursor)
    cursor = node.parentId
  }

  path.reverse()
  return path
}

/**
 * Build a result for a terminal state. A found result must carry a non-empty
 * path; anything else is recorded as `not_found`.
 */
export function solutionResult(
  outcome: Result['outcome'],
  path: number[] | null,
  metrics: Metrics,
): Result {
  const foundPath = outcome === 'found' && path !== null ? [...path] : null
  return {
    outcome: foundPath !== null ? 'found' : 'not_found',
    moves: foundPath !== null ? foundPath.length - 1 : null,
    path: foundPath,
    metrics: cloneMetrics(metrics),
  }
}
