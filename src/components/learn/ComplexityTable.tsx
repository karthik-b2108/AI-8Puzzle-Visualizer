import { formatNumber } from '../../utils/format'
import styles from './ComplexityTable.module.css'

/** 9! / 2: the number of states reachable from any one 8-puzzle arrangement. */
const REACHABLE_STATES = 181_440

/**
 * Worst-case cost comparison. Numbers are exposed as plain text (not only in
 * the prose) so they can be quoted and tested without parsing superscripts.
 */
export default function ComplexityTable() {
  return (
    <figure className={styles.figure}>
      <p className={styles.title}>
        Worst-case cost of depth-first search (DFS) compared with breadth-first search (BFS).
      </p>
      <div
        className={styles.scroll}
        tabIndex={0}
        role="region"
        aria-label="Complexity comparison table"
      >
        <table className={styles.table}>
          <caption className="sr-only">
            Worst-case time and space cost of depth-first search and breadth-first search on the
            8-puzzle.
          </caption>
          <thead>
            <tr>
              <th scope="col">Measure</th>
              <th scope="col">DFS — this app</th>
              <th scope="col">BFS — for comparison</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Time</th>
              <td>
                <code>O(b^m)</code>
              </td>
              <td>
                <code>O(b^d)</code>
              </td>
            </tr>
            <tr>
              <th scope="row">Frontier space</th>
              <td>
                <code>O(b·m)</code>
              </td>
              <td>
                <code>O(b^d)</code>
              </td>
            </tr>
            <tr>
              <th scope="row">Visited states, worst case</th>
              <td>
                <span className={styles.strong}>{formatNumber(REACHABLE_STATES)}</span> states
              </td>
              <td>{formatNumber(REACHABLE_STATES)} states</td>
            </tr>
            <tr>
              <th scope="row">First goal returned</th>
              <td>Deepest-first, order-dependent</td>
              <td>Shallowest, so a shortest path</td>
            </tr>
          </tbody>
        </table>
      </div>
      <dl className={styles.legend}>
        <div>
          <dt>b</dt>
          <dd>Branching factor: children pushed per expanded node, at most 4.</dd>
        </div>
        <div>
          <dt>m</dt>
          <dd>Depth limit, 1–30 in this app (default 6).</dd>
        </div>
        <div>
          <dt>d</dt>
          <dd>Depth of the shallowest solution, used by BFS.</dd>
        </div>
        <div>
          <dt>9!/2</dt>
          <dd>
            {formatNumber(REACHABLE_STATES)} states reachable from a given arrangement. Parity makes
            the other 9!/2 arrangements unreachable.
          </dd>
        </div>
      </dl>
    </figure>
  )
}
