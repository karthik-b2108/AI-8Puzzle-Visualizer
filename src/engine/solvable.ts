/** Reachability check for the 8-puzzle via inversion parity. */

import { BLANK, decode, isValidState } from './codec'

/** Number of inversions among the tiles, ignoring the blank. */
export function countInversions(state: number): number {
  const tiles = decode(state).filter((digit) => digit !== BLANK)
  let count = 0
  for (let left = 0; left < tiles.length; left += 1) {
    for (let right = left + 1; right < tiles.length; right += 1) {
      if (tiles[left] > tiles[right]) count += 1
    }
  }
  return count
}

/**
 * Two boards are mutually reachable exactly when they hold the same tiles and
 * their inversion counts have the same parity. Equal boards are trivially
 * reachable; invalid boards are never considered solvable.
 */
export function isSolvable(start: number, goal: number): boolean {
  if (!isValidState(start) || !isValidState(goal)) return false
  if (start === goal) return true

  const startTiles = decode(start)
    .filter((digit) => digit !== BLANK)
    .sort((left, right) => left - right)
  const goalTiles = decode(goal)
    .filter((digit) => digit !== BLANK)
    .sort((left, right) => left - right)

  for (let index = 0; index < startTiles.length; index += 1) {
    if (startTiles[index] !== goalTiles[index]) return false
  }

  return countInversions(start) % 2 === countInversions(goal) % 2
}
