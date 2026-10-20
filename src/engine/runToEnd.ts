/**
 * Headless convenience runner. Builds a controller, runs it to completion and
 * reports the wall-clock time of the whole run.
 */

import type { SearchConfig, SearchSnapshot } from '../contract/types'
import { createSearch } from './dfs'

export function runToEnd(config: SearchConfig): SearchSnapshot {
  const startedAt = performance.now()
  const snapshot = createSearch(config).runToEnd()
  const wallClockMs = performance.now() - startedAt

  // Keep the engine's accumulated step time, but never report less than the
  // measured wall clock for a full headless run.
  const elapsedMs = Math.max(snapshot.metrics.elapsedMs, wallClockMs)
  const metrics = { ...snapshot.metrics, elapsedMs }
  const result = snapshot.result ? { ...snapshot.result, metrics: { ...metrics } } : null

  return { ...snapshot, metrics, result }
}
