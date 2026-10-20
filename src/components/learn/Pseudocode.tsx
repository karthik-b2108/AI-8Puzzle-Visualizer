import { useMemo } from 'react'
import styles from './Pseudocode.module.css'

const KEYWORDS = new Set([
  'function',
  'while',
  'if',
  'for',
  'return',
  'continue',
  'else',
  'in',
  'not',
  'is',
  'empty',
  'null',
  'true',
  'false',
  'and',
  'or',
  'reverse',
  'mark',
  'as',
])

const DFS_PSEUDOCODE = `function DFS(start, goal, depthLimit):
  root = makeNode(start, parent = null, depth = 0)
  stack = [root]                    # frontier; the top is the last element
  visited = empty Set               # states already expanded
  generated = 1                     # the root counts as generated
  explored = 0

  while stack is not empty:
    node = stack.pop()              # (1) take the deepest waiting node
    if node.state in visited:       # another branch may have queued it first
      mark node as duplicate
      continue

    visited.add(node.state)         # (2) expand each state at most once
    explored = explored + 1

    if node.state = goal:           # (3) goal test on pop, not on push
      return path(root -> node)     # follow parent links back to the root

    if node.depth = depthLimit:     # (4) never descend past the limit
      continue

    # (5) push in reverse so the first move (U) ends on top
    for move in reverse([U, D, L, R]):
      next = apply(node.state, move)
      if node.parent is not null and next = node.parent.state:
        continue                    # parent pruning: never step straight back
      if next in visited:
        continue                    # cycle pruning: skip expanded states
      child = makeNode(next, parent = node, depth = node.depth + 1)
      stack.push(child)
      generated = generated + 1

  return notFound("not found within depth limit " + depthLimit)`

type TokenKind = 'keyword' | 'number' | 'fn' | 'comment'

interface Token {
  text: string
  kind?: TokenKind
}

function tokenize(line: string): Token[] {
  const hash = line.indexOf('#')
  const code = hash === -1 ? line : line.slice(0, hash)
  const comment = hash === -1 ? '' : line.slice(hash)
  const tokens: Token[] = []
  const pattern = /([A-Za-z_][A-Za-z0-9_]*|\d+|\s+|.)/g
  let match = pattern.exec(code)

  while (match !== null) {
    const text = match[1]
    if (/^\s+$/.test(text)) {
      tokens.push({ text })
    } else if (/^\d+$/.test(text)) {
      tokens.push({ text, kind: 'number' })
    } else if (/^[A-Za-z_]/.test(text)) {
      if (KEYWORDS.has(text)) {
        tokens.push({ text, kind: 'keyword' })
      } else {
        const rest = code.slice(match.index + text.length)
        tokens.push({ text, kind: /^\s*\(/.test(rest) ? 'fn' : undefined })
      }
    } else {
      tokens.push({ text })
    }
    match = pattern.exec(code)
  }

  if (comment) tokens.push({ text: comment, kind: 'comment' })
  return tokens
}

interface PseudocodeProps {
  /** Source lines; defaults to the algorithm used by the visualizer. */
  code?: string
  caption?: string
  label?: string
  lineNumbers?: boolean
}

/**
 * A dependency-free code block: semantic `<pre><code>`, line numbers in a
 * separate column and a tiny tokenizer for keywords, calls, numbers and comments.
 */
export default function Pseudocode({
  code = DFS_PSEUDOCODE,
  caption = 'The loop used by the visualizer: stack frontier, visited set, parent pruning and a depth limit.',
  label = 'Depth-first search pseudocode',
  lineNumbers = true,
}: PseudocodeProps) {
  const lines = useMemo(() => code.replace(/\n+$/, '').split('\n'), [code])

  return (
    <figure className={styles.figure}>
      <div className={styles.scroll} tabIndex={0} role="region" aria-label={`${label}, scrollable`}>
        <pre className={styles.pre}>
          <code>
            {lines.map((line, index) => (
              <span className={styles.line} key={index}>
                {lineNumbers ? (
                  <span className={styles.lineNumber} aria-hidden="true">
                    {index + 1}
                  </span>
                ) : null}
                <span className={styles.lineCode}>
                  {tokenize(line).map((token, tokenIndex) =>
                    token.kind ? (
                      <span className={styles[token.kind]} key={tokenIndex}>
                        {token.text}
                      </span>
                    ) : (
                      <span key={tokenIndex}>{token.text}</span>
                    ),
                  )}
                </span>
              </span>
            ))}
          </code>
        </pre>
      </div>
      <figcaption className={styles.caption}>{caption}</figcaption>
    </figure>
  )
}
