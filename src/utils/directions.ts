import type { Move } from '../contract/types'

export type Direction = Exclude<Move, null>

export const MOVE_ARROWS: Record<Direction, string> = {
  U: '↑',
  D: '↓',
  L: '←',
  R: '→',
}

export const MOVE_NAMES: Record<Direction, string> = {
  U: 'Up',
  D: 'Down',
  L: 'Left',
  R: 'Right',
}

/** Arrow for a move, or a dot for the root. */
export function moveArrow(move: Move): string {
  return move ? MOVE_ARROWS[move] : '•'
}

export function moveName(move: Move): string {
  return move ? MOVE_NAMES[move] : 'Start'
}

export function oppositeMove(move: Direction): Direction {
  switch (move) {
    case 'U':
      return 'D'
    case 'D':
      return 'U'
    case 'L':
      return 'R'
    case 'R':
      return 'L'
  }
}
