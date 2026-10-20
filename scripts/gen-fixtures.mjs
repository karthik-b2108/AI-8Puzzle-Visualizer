/**
 * Generates the frozen fixture snapshots in src/contract/fixtures/.
 *
 * This script intentionally contains its own tiny DFS implementation so that the
 * fixtures are real data (including a 3,000+ node tree) without depending on the
 * engine track. Run with `npm run fixtures`.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(here, '../src/contract/fixtures')

const GOAL = 123456789
const BLANK = 9

const decode = (value) => String(value).padStart(9, '0').split('').map(Number)
const encode = (digits) => digits.reduce((acc, digit) => acc * 10 + digit, 0)

function neighbors(state) {
  const digits = decode(state)
  const blank = digits.indexOf(BLANK)
  const row = Math.floor(blank / 3)
  const col = blank % 3
  const result = []
  const swap = (target, move) => {
    const next = digits.slice()
    next[blank] = next[target]
    next[target] = BLANK
    result.push({ state: encode(next), move })
  }
  if (row > 0) swap(blank - 3, 'U')
  if (row < 2) swap(blank + 3, 'D')
  if (col > 0) swap(blank - 1, 'L')
  if (col < 2) swap(blank + 1, 'R')
  return result
}

function createSearch(config) {
  const root = {
    id: 0,
    state: config.start,
    parentId: null,
    depth: 0,
    move: null,
    status: 'frontier',
    children: [],
  }
  const nodes = { 0: root }
  const stack = [0]
  const visited = new Set()
  const visitedOrder = []
  const metrics = { generated: 1, explored: 0, maxDepth: 0, elapsedMs: 0 }
  let nextId = 1
  let currentId = null
  let parentOfCurrentId = null
  let result = null

  function snapshot() {
    const copiedNodes = {}
    for (const [id, node] of Object.entries(nodes)) {
      copiedNodes[id] = { ...node, children: node.children.slice() }
    }
    return {
      config: { ...config },
      nodes: copiedNodes,
      stack: stack.slice(),
      visited: visitedOrder.slice(),
      currentId,
      parentOfCurrentId,
      metrics: { ...metrics, elapsedMs: round(metrics.elapsedMs) },
      result: result
        ? {
            ...result,
            path: result.path ? result.path.slice() : null,
            metrics: { ...result.metrics, elapsedMs: round(result.metrics.elapsedMs) },
          }
        : null,
      canUndo: metrics.explored + (stack.length ? 1 : 0) > 1 || currentId !== null,
      canRedo: false,
    }
  }

  function step() {
    const started = performance.now()
    if (result) return
    if (stack.length === 0) {
      metrics.elapsedMs += performance.now() - started
      result = { outcome: 'not_found', moves: null, path: null, metrics: { ...metrics } }
      return
    }
    const id = stack.pop()
    const node = nodes[id]
    currentId = id
    parentOfCurrentId = node.parentId
    if (visited.has(node.state)) {
      node.status = 'duplicate'
      metrics.elapsedMs += performance.now() - started
      return
    }
    visited.add(node.state)
    visitedOrder.push(node.state)
    metrics.explored += 1
    node.status = 'visited'
    if (node.state === config.goal) {
      node.status = 'goal'
      const path = []
      let cursor = id
      while (cursor !== null) {
        path.unshift(cursor)
        cursor = nodes[cursor].parentId
      }
      result = {
        outcome: 'found',
        moves: path.length - 1,
        path,
        metrics: { ...metrics },
      }
      metrics.elapsedMs += performance.now() - started
      result.metrics = { ...metrics }
      return
    }
    if (node.depth < config.depthLimit) {
      const parentState = node.parentId === null ? null : nodes[node.parentId].state
      const created = []
      for (const candidate of neighbors(node.state)) {
        if (candidate.state === parentState || visited.has(candidate.state)) continue
        const child = {
          id: nextId++,
          state: candidate.state,
          parentId: node.id,
          depth: node.depth + 1,
          move: candidate.move,
          status: 'frontier',
          children: [],
        }
        nodes[child.id] = child
        created.push(child.id)
        node.children.push(child.id)
        metrics.generated += 1
        metrics.maxDepth = Math.max(metrics.maxDepth, child.depth)
      }
      for (let i = created.length - 1; i >= 0; i -= 1) stack.push(created[i])
    }
    metrics.elapsedMs += performance.now() - started
  }

  return { step, snapshot, get nodeCount() { return Object.keys(nodes).length }, get result() { return result } }
}

const round = (value) => Math.round(value * 1000) / 1000

function write(name, snapshot) {
  const file = resolve(outDir, name)
  writeFileSync(file, `${JSON.stringify(snapshot, null, 2)}\n`)
  console.log(`wrote ${name}: ${Object.keys(snapshot.nodes).length} nodes, ${snapshot.visited.length} visited`)
}

mkdirSync(outDir, { recursive: true })

const defaultConfig = { start: 123745896, goal: GOAL, depthLimit: 6 }

// Initial — nothing has run yet.
{
  const search = createSearch(defaultConfig)
  write('initial.json', search.snapshot())
}

// Mid-run — a deeper limit gives the tree room to grow without finishing.
{
  const search = createSearch({ start: 724596831, goal: GOAL, depthLimit: 8 })
  for (let i = 0; i < 30; i += 1) {
    if (search.result) throw new Error('mid-run fixture finished unexpectedly')
    search.step()
  }
  write('mid-run.json', search.snapshot())
}

// Found — the default board at the default depth limit is solvable in 5 moves.
{
  const search = createSearch(defaultConfig)
  let guard = 0
  while (!search.result && guard < 100000) {
    search.step()
    guard += 1
  }
  if (!search.result || search.result.outcome !== 'found') {
    throw new Error('expected the default board to be solved')
  }
  write('found.json', search.snapshot())
}

// Not found — the same deep board capped at three plies.
{
  const search = createSearch({ start: 724596831, goal: GOAL, depthLimit: 3 })
  let guard = 0
  while (!search.result && guard < 100000) {
    search.step()
    guard += 1
  }
  if (!search.result || search.result.outcome !== 'not_found') {
    throw new Error('expected a depth-limited miss')
  }
  write('not-found.json', search.snapshot())
}

// Large — keep stepping until the tree holds at least 3,000 nodes.
{
  const search = createSearch({ start: 724596831, goal: GOAL, depthLimit: 16 })
  let guard = 0
  while (search.nodeCount < 3000 && !search.result && guard < 200000) {
    search.step()
    guard += 1
  }
  if (search.nodeCount < 3000) {
    throw new Error(
      `large fixture only reached ${search.nodeCount} nodes (result: ${search.result?.outcome ?? 'none'})`,
    )
  }
  write('large-3000.json', search.snapshot())
}
