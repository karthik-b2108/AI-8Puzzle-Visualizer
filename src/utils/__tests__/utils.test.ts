import { describe, expect, it } from 'vitest'
import { moveArrow, moveName, oppositeMove } from '../directions'
import { formatClock, formatDuration, formatNumber, formatPercent, pluralize } from '../format'

describe('directions', () => {
  it('maps moves to arrows and names', () => {
    expect(moveArrow('U')).toBe('↑')
    expect(moveArrow('D')).toBe('↓')
    expect(moveArrow('L')).toBe('←')
    expect(moveArrow('R')).toBe('→')
    expect(moveArrow(null)).toBe('•')
    expect(moveName(null)).toBe('Start')
    expect(moveName('L')).toBe('Left')
  })

  it('inverts moves', () => {
    expect(oppositeMove('U')).toBe('D')
    expect(oppositeMove('D')).toBe('U')
    expect(oppositeMove('L')).toBe('R')
    expect(oppositeMove('R')).toBe('L')
  })
})

describe('format', () => {
  it('formats numbers and percentages', () => {
    expect(formatNumber(1234)).toBe('1,234')
    expect(formatPercent(0.256)).toBe('26%')
    expect(pluralize(1, 'node')).toBe('node')
    expect(pluralize(2, 'node')).toBe('nodes')
  })

  it('formats durations', () => {
    expect(formatDuration(420)).toBe('420 ms')
    expect(formatDuration(1240)).toBe('1.24 s')
    expect(formatDuration(64_000)).toBe('1 m 04 s')
    expect(formatDuration(-5)).toBe('0 ms')
  })

  it('formats the live clock', () => {
    expect(formatClock(0)).toBe('0.000 s')
    expect(formatClock(1240)).toBe('1.240 s')
    expect(formatClock(62_480)).toBe('1:02.480')
  })
})
