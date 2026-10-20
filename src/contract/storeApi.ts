import type { SearchConfig, SearchSnapshot } from './types'

/**
 * FROZEN CONTRACT — every UI component codes against this interface.
 * `useSearchStore` implements it.
 */
export interface SearchStoreApi {
  snapshot: SearchSnapshot
  /** Resets the search with a new configuration. */
  configure(config: SearchConfig): void
  step(): void
  undo(): void
  redo(): void
  reset(): void
  runToEnd(): void
  autoplay: { running: boolean; speed: number }
  setAutoplay(running: boolean): void
  setSpeed(speed: number): void
}
