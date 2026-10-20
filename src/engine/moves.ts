/** Blank moves, neighbour generation and direction lookups. */

import type { Move } from '../contract/types'
import { BOARD_SIZE, BLANK, decode, encode } from './codec'

export type NeighborMove = Exclude<Move, null>

export interface Neighbor {
  state: number
  move: NeighborMove
}

const COLUMNS = 3
const ROWS = 3
const ROW_STRIDE = COLUMNS

/** Index (0-8) of the blank square, or -1 when the state has no blank. */
export function findBlank(state: number): number {
  return decode(state).indexOf(BLANK)
}

/**
 * Legal neighbours of a state in U, D, L, R order. Moves that would wrap
 * across a row are rejected.
 */
export function neighbors(state: number): Neighbor[] {
  const digits = decode(state)
  if (digits.length !== BOARD_SIZE) return []

  const blank = digits.indexOf(BLANK)
  if (blank < 0) return []

  const row = Math.floor(blank / COLUMNS)
  const column = blank % COLUMNS
  const result: Neighbor[] = []

  const swapWith = (target: number, move: NeighborMove): void => {
    const next = digits.slice()
    next[blank] = next[target]
    next[target] = BLANK
    result.push({ state: encode(next), move })
  }

  if (row > 0) swapWith(blank - ROW_STRIDE, 'U')
  if (row < ROWS - 1) swapWith(blank + ROW_STRIDE, 'D')
  if (column > 0) swapWith(blank - 1, 'L')
  if (column < COLUMNS - 1) swapWith(blank + 1, 'R')

  return result
}

/** The move that turns `from` into `to`, or null when they are not adjacent. */
export function moveBetweenStates(from: number, to: number): Move {
  if (from === to) return null
  for (const neighbor of neighbors(from)) {
    if (neighbor.state === to) return neighbor.move
  }
  return null
}

/** Apply a move to a state. Invalid or null moves leave the state untouched. */
export function applyMove(state: number, move: Move): number {
  if (move === null) return state
  for (const neighbor of neighbors(state)) {
    if (neighbor.move === move) return neighbor.state
  }
  return state
}
