import { describe, expect, it } from 'vitest'
import { DEFAULT_GOAL, DEFAULT_START } from '../../contract/defaults'
import { encode } from '../codec'
import { countInversions, isSolvable } from '../solvable'

const swappedPair = encode([2, 1, 3, 7, 4, 5, 8, 9, 6])

describe('countInversions', () => {
  it('counts inversions while ignoring the blank', () => {
    expect(countInversions(123_456_789)).toBe(0)
    expect(countInversions(213_456_789)).toBe(1)
    expect(countInversions(987_654_321)).toBe(28)
    expect(countInversions(encode([9, 2, 3, 4, 5, 6, 7, 8, 1]))).toBe(7)
  })
})

describe('isSolvable', () => {
  it('accepts the default pair', () => {
    expect(isSolvable(DEFAULT_START, DEFAULT_GOAL)).toBe(true)
    expect(isSolvable(DEFAULT_GOAL, DEFAULT_START)).toBe(true)
  })

  it('rejects a pair with swapped tiles', () => {
    expect(isSolvable(swappedPair, DEFAULT_GOAL)).toBe(false)
    expect(isSolvable(DEFAULT_GOAL, swappedPair)).toBe(false)
  })

  it('treats equal boards as solvable in zero moves', () => {
    expect(isSolvable(DEFAULT_START, DEFAULT_START)).toBe(true)
    expect(isSolvable(DEFAULT_GOAL, DEFAULT_GOAL)).toBe(true)
  })

  it('rejects invalid boards', () => {
    expect(isSolvable(123_456_788, DEFAULT_GOAL)).toBe(false)
    expect(isSolvable(DEFAULT_START, 123_456_780)).toBe(false)
    expect(isSolvable(-1, DEFAULT_GOAL)).toBe(false)
  })

  it('rejects boards that do not hold the same tiles', () => {
    const withZero = encode([0, 1, 2, 3, 4, 5, 6, 7, 9])
    expect(isSolvable(withZero, withZero)).toBe(true)
    expect(isSolvable(withZero, DEFAULT_GOAL)).toBe(false)
  })
})
