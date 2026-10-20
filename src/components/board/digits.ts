/**
 * Board integer helpers.
 *
 * Track A owns the canonical codec in `src/engine/codec.ts`. The board
 * components deliberately avoid importing from `src/engine` so they can be
 * built, tested and merged independently; these helpers implement the tiny
 * subset the UI needs (9 digits, 9 = blank).
 */

import { BLANK, TILE_COUNT } from '../../contract/defaults'

/** Decode a board integer into exactly nine digits, left to right. */
export function digitsOf(state: number): number[] {
  const safe = Number.isFinite(state) ? Math.trunc(Math.abs(state)) : 0
  return String(safe)
    .padStart(TILE_COUNT, '0')
    .slice(-TILE_COUNT)
    .split('')
    .map(Number)
}

/** Encode nine digits into a board integer. */
export function encodeDigits(digits: readonly number[]): number {
  return digits.reduce((value, digit) => value * 10 + digit, 0)
}

/** Return a copy of `digits` with two positions swapped. */
export function swapDigits(digits: readonly number[], a: number, b: number): number[] {
  const next = [...digits]
  const held = next[a]
  next[a] = next[b]
  next[b] = held
  return next
}

export function isBlank(digit: number): boolean {
  return digit === BLANK
}
