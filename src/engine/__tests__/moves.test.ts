import { describe, expect, it } from 'vitest'
import { encode } from '../codec'
import { applyMove, findBlank, moveBetweenStates, neighbors } from '../moves'

const board = (digits: number[]): number => encode(digits)

describe('findBlank', () => {
  it('finds the blank square', () => {
    expect(findBlank(board([9, 1, 2, 3, 4, 5, 6, 7, 8]))).toBe(0)
    expect(findBlank(board([1, 2, 3, 4, 5, 6, 7, 8, 9]))).toBe(8)
    expect(findBlank(board([1, 2, 3, 9, 4, 5, 6, 7, 8]))).toBe(3)
  })
})

describe('neighbors', () => {
  it('returns two moves from a corner, in U, D, L, R order', () => {
    const topLeft = board([9, 1, 2, 3, 4, 5, 6, 7, 8])
    expect(neighbors(topLeft)).toEqual([
      { state: board([3, 1, 2, 9, 4, 5, 6, 7, 8]), move: 'D' },
      { state: board([1, 9, 2, 3, 4, 5, 6, 7, 8]), move: 'R' },
    ])
    expect(neighbors(topLeft)).toHaveLength(2)

    const bottomRight = board([1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(neighbors(bottomRight).map((neighbor) => neighbor.move)).toEqual(['U', 'L'])
  })

  it('returns three moves from an edge', () => {
    const topMiddle = board([1, 9, 2, 3, 4, 5, 6, 7, 8])
    const result = neighbors(topMiddle)
    expect(result).toHaveLength(3)
    expect(result.map((neighbor) => neighbor.move)).toEqual(['D', 'L', 'R'])
    expect(result[0].state).toBe(board([1, 4, 2, 3, 9, 5, 6, 7, 8]))
    expect(result[1].state).toBe(board([9, 1, 2, 3, 4, 5, 6, 7, 8]))
    expect(result[2].state).toBe(board([1, 2, 9, 3, 4, 5, 6, 7, 8]))

    expect(neighbors(board([1, 2, 3, 9, 4, 5, 6, 7, 8])).map((n) => n.move)).toEqual([
      'U',
      'D',
      'R',
    ])
  })

  it('returns four moves from the centre, in U, D, L, R order', () => {
    const centre = board([1, 2, 3, 4, 9, 5, 6, 7, 8])
    const result = neighbors(centre)
    expect(result).toHaveLength(4)
    expect(result.map((neighbor) => neighbor.move)).toEqual(['U', 'D', 'L', 'R'])
    expect(result.map((neighbor) => neighbor.state)).toEqual([
      board([1, 9, 3, 4, 2, 5, 6, 7, 8]),
      board([1, 2, 3, 4, 7, 5, 6, 9, 8]),
      board([1, 2, 3, 9, 4, 5, 6, 7, 8]),
      board([1, 2, 3, 4, 5, 9, 6, 7, 8]),
    ])
  })

  it('never wraps a move across a row boundary', () => {
    expect(neighbors(board([1, 2, 9, 3, 4, 5, 6, 7, 8])).map((n) => n.move)).toEqual([
      'D',
      'L',
    ])
    expect(neighbors(board([1, 2, 3, 4, 5, 9, 6, 7, 8])).map((n) => n.move)).toEqual([
      'U',
      'D',
      'L',
    ])
    expect(neighbors(board([1, 2, 3, 4, 5, 6, 9, 7, 8])).map((n) => n.move)).toEqual([
      'U',
      'R',
    ])
  })

  it('returns no neighbours when there is no blank', () => {
    expect(neighbors(123_456_780)).toEqual([])
  })
})

describe('applyMove and moveBetweenStates', () => {
  const start = board([1, 2, 3, 4, 9, 5, 6, 7, 8])

  it('applies every legal move consistently', () => {
    for (const neighbor of neighbors(start)) {
      expect(applyMove(start, neighbor.move)).toBe(neighbor.state)
      expect(moveBetweenStates(start, neighbor.state)).toBe(neighbor.move)
      expect(moveBetweenStates(neighbor.state, start)).not.toBeNull()
    }
  })

  it('returns null or the original state when no move applies', () => {
    expect(moveBetweenStates(start, start)).toBeNull()
    expect(moveBetweenStates(start, 123_456_789)).toBeNull()
    expect(applyMove(start, null)).toBe(start)
  })

  it('distinguishes directions between two adjacent states', () => {
    const up = applyMove(start, 'U')
    expect(moveBetweenStates(start, up)).toBe('U')
    expect(moveBetweenStates(up, start)).toBe('D')
  })
})
