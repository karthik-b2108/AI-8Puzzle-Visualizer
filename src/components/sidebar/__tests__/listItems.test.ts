import { describe, expect, it } from 'vitest'
import type { SearchSnapshot } from '../../../contract/types'
import midRun from '../../../contract/fixtures/mid-run.json'
import found from '../../../contract/fixtures/found.json'
import { exploredItems, filterItems, frontierItems, matchesQuery } from '../listItems'

const mid = midRun as unknown as SearchSnapshot
const solved = found as unknown as SearchSnapshot

describe('sidebar list item derivation', () => {
  it('lists the frontier top first and marks the next node', () => {
    const items = frontierItems(mid)
    expect(items).toHaveLength(mid.stack.length)
    expect(items[0]?.id).toBe(mid.stack[mid.stack.length - 1])
    expect(items[0]?.isNext).toBe(true)
    expect(items.filter((item) => item.isNext)).toHaveLength(1)
    expect(items.at(-1)?.id).toBe(mid.stack[0])
  })

  it('lists explored nodes in visit order with a 1-based order', () => {
    const items = exploredItems(mid)
    expect(items).toHaveLength(mid.visited.length)
    expect(items[0]?.state).toBe(mid.visited[0])
    expect(items[0]?.order).toBe(1)
    expect(items.at(-1)?.state).toBe(mid.visited[mid.visited.length - 1])
    expect(items.at(-1)?.order).toBe(mid.visited.length)
  })

  it('resolves the goal node after a solution', () => {
    const items = exploredItems(solved)
    expect(items.at(-1)?.status).toBe('goal')
    expect(items.at(-1)?.state).toBe(solved.config.goal)
  })
})

describe('sidebar filtering', () => {
  it('matches node ids', () => {
    const [item] = frontierItems(mid)
    expect(item).toBeDefined()
    expect(matchesQuery(item, String(item.id))).toBe(true)
    expect(matchesQuery(item, '')).toBe(true)
    expect(matchesQuery(item, 'zzz')).toBe(false)
  })

  it('filters lists and ignores whitespace', () => {
    const items = frontierItems(mid)
    const target = items[0]
    const filtered = filterItems(items, ` ${target.id} `)
    expect(filtered.some((item) => item.id === target.id)).toBe(true)
    expect(filterItems(items, '   ')).toHaveLength(items.length)
  })
})
