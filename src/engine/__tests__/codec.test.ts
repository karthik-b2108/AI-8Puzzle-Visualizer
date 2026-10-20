import { describe, expect, it } from 'vitest'
import { decode, encode, formatState, isValidState } from '../codec'

/** Deterministic PRNG so the "random" round-trip cases are reproducible. */
function seededRandom(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value = (value * 1_664_525 + 1_013_904_223) >>> 0
    return value / 0x1_0000_0000
  }
}

/** Shuffle 0-8, then replace one slot with the blank to get a valid board. */
function randomBoard(random: () => number): number[] {
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8]
  for (let index = digits.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    const held = digits[index]
    digits[index] = digits[swap]
    digits[swap] = held
  }
  digits[Math.floor(random() * digits.length)] = 9
  return digits
}

describe('codec', () => {
  it('encodes nine digits into an integer', () => {
    expect(encode([1, 2, 3, 4, 5, 6, 7, 8, 9])).toBe(123_456_789)
    expect(encode([9, 1, 2, 3, 4, 5, 6, 7, 8])).toBe(912_345_678)
    expect(encode([0, 1, 2, 3, 4, 5, 6, 7, 9])).toBe(12_345_679)
  })

  it('decodes to exactly nine digits, padding with zeros', () => {
    expect(decode(123_456_789)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(decode(12_345_679)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 9])
    expect(decode(0)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0])
    expect(decode(7)).toHaveLength(9)
  })

  it('round-trips every random board, including a leading zero or blank', () => {
    const random = seededRandom(20_261_020)
    for (let iteration = 0; iteration < 500; iteration += 1) {
      const digits = randomBoard(random)
      const state = encode(digits)
      expect(decode(state)).toEqual(digits)
      expect(encode(decode(state))).toBe(state)
      expect(isValidState(state)).toBe(true)
      expect(formatState(state)).toBe(digits.join(''))
    }
  })

  it('round-trips a board whose top-left square is the blank', () => {
    const digits = [9, 8, 7, 6, 5, 4, 3, 2, 1]
    expect(decode(encode(digits))).toEqual(digits)
  })

  it('formats states as nine zero-padded characters', () => {
    expect(formatState(123_456_789)).toBe('123456789')
    expect(formatState(12_345_679)).toBe('012345679')
    expect(formatState(0)).toBe('000000000')
    for (const state of [1, 12_345_679, 987_654_321]) {
      expect(formatState(state)).toHaveLength(9)
    }
  })

  it('accepts valid states, including boards with a leading zero piece', () => {
    expect(isValidState(123_456_789)).toBe(true)
    expect(isValidState(123_745_896)).toBe(true)
    expect(isValidState(12_345_679)).toBe(true) // decoded: 012345679
    expect(isValidState(912_345_678)).toBe(true)
  })

  it('rejects invalid states', () => {
    expect(isValidState(123_456_788)).toBe(false) // duplicate 8, no blank
    expect(isValidState(123_456_789)).toBe(true)
    expect(isValidState(123_456_7890)).toBe(false) // ten digits
    expect(isValidState(123_456_78)).toBe(false) // padded 012345678 has no blank
    expect(isValidState(-123_456_789)).toBe(false)
    expect(isValidState(1.5)).toBe(false)
    expect(isValidState(Number.NaN)).toBe(false)
    expect(isValidState(11_234_567)).toBe(false) // duplicate 1
  })

  it('throws on malformed encode input', () => {
    expect(() => encode([1, 2, 3])).toThrow(RangeError)
    expect(() => encode([1, 2, 3, 4, 5, 6, 7, 8, 10])).toThrow(RangeError)
    expect(() => encode([-1, 2, 3, 4, 5, 6, 7, 8, 9])).toThrow(RangeError)
  })
})
