/**
 * 9-digit integer codec.
 *
 * A board state is a single integer: digit `y` (left-to-right, top-to-bottom)
 * is the piece on square `y`, and `9` is the blank. The most significant digit
 * is the top-left square, so a state may have fewer than nine decimal digits
 * when the top-left square holds piece `0`. `decode` always restores nine
 * digits by left-padding with zeros.
 */

export const BOARD_SIZE = 9
export const BLANK = 9

/** Largest valid state: 999_999_999 (nine decimal digits). */
const MAX_STATE = 1_000_000_000

/** Encode nine board digits (blank = 9) as a 9-digit integer. */
export function encode(digits: readonly number[]): number {
  if (digits.length !== BOARD_SIZE) {
    throw new RangeError(`encode expects ${BOARD_SIZE} digits, received ${digits.length}`)
  }

  let state = 0
  for (const digit of digits) {
    if (!Number.isInteger(digit) || digit < 0 || digit > 9) {
      throw new RangeError(`encode expects digits 0-9, received ${String(digit)}`)
    }
    state = state * 10 + digit
  }
  return state
}

/** Decode a state into exactly nine digits, left-padded with zeros. */
export function decode(state: number): number[] {
  const text = formatState(state)
  const digits = new Array<number>(BOARD_SIZE)
  for (let index = 0; index < BOARD_SIZE; index += 1) {
    digits[index] = text.charCodeAt(index) - 48
  }
  return digits
}

/**
 * A valid board has nine distinct digits with exactly one blank (9). The other
 * eight digits are pieces; a leading zero is a piece on the top-left square,
 * not the blank, so 8-digit integers such as 12345679 are valid (they decode
 * to 012345679).
 */
export function isValidState(state: number): boolean {
  if (!Number.isInteger(state) || state < 0 || state >= MAX_STATE) return false

  const digits = decode(state)
  const seen = new Array<boolean>(10).fill(false)
  let blanks = 0
  for (const digit of digits) {
    if (seen[digit]) return false
    seen[digit] = true
    if (digit === BLANK) blanks += 1
  }
  return blanks === 1
}

/** Nine-character zero-padded representation for monospace display. */
export function formatState(state: number): string {
  const text = String(Number.isFinite(state) ? Math.trunc(Math.abs(state)) : 0)
  if (text.length >= BOARD_SIZE) return text.slice(-BOARD_SIZE)
  return text.padStart(BOARD_SIZE, '0')
}
