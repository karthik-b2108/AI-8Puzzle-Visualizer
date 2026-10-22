import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Callout from '../components/learn/Callout'
import ComplexityTable from '../components/learn/ComplexityTable'
import DfsDiagram from '../components/learn/DfsDiagram'
import Pseudocode from '../components/learn/Pseudocode'
import Section from '../components/learn/Section'
import StateDiagram from '../components/learn/StateDiagram'
import Toc from '../components/learn/Toc'
import { LEARN_SECTIONS } from '../components/learn/sections'
import { useLearnMotion } from '../hooks/useLearnMotion'
import { formatNumber } from '../utils/format'
import styles from './LearnPage.module.css'

const REACHABLE_STATES = 181_440

export default function LearnPage() {
  const pageRef = useRef<HTMLElement>(null)
  useLearnMotion(pageRef)

  return (
    <main id="main-content" tabIndex={-1} className={styles.page} ref={pageRef}>
      <div className={styles.progress} data-reading-progress aria-hidden="true" />

      <div className={styles.heroBand}>
        <header className={styles.hero}>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>Learn · Depth-first search</p>
            <h1 className={styles.title}>How depth-first search solves the 8-puzzle</h1>
            <p className={styles.lead}>
              The visualizer is a graph search with a stack, a visited set and a depth limit. This
              page explains what each piece does, why the search is light on memory but not
              guaranteed to find the shortest solution, and where its limits are.
            </p>
          </div>
        </header>
      </div>

      <div className={styles.layout}>
        <Toc sections={LEARN_SECTIONS} />

        <article className={styles.content}>
          <Section
            id="description"
            number={1}
            title="Description"
            eyebrow="What the app shows"
          >
            <p>
              Every 8-puzzle position is stored as a single 9-digit integer. Read the board row by
              row: <code>123456789</code> is the standard goal in this app, the digits 1–8 are tiles
              and 9 is the blank. A move swaps the blank with an adjacent tile, so a position has at
              most four successors — two in a corner, three on an edge, four in the centre.
            </p>
            <p>
              The visualizer treats those positions as a graph and runs <strong>depth-first search</strong>{' '}
              (DFS) from the start state to the goal state. Three pieces of bookkeeping make the
              search work: a <strong>stack</strong> holding the frontier (nodes waiting to be
              expanded), a <strong>visited set</strong> of states that have already been expanded,
              and <strong>parent links</strong> on every node so a solution can be read back from
              the goal.
            </p>
            <p>
              On each step the search pops the node on top of the stack, discards it if its state is
              already in the visited set, and otherwise marks it visited. If that state is the goal,
              the search stops. If not, and the node is still above the depth limit, its children are
              pushed on top of the stack. Because the last child pushed is the first one popped, the
              search immediately follows the most recently discovered branch.
            </p>

            <h3>What you see in the interface</h3>
            <ul>
              <li>
                The <strong>board</strong> with the tiles touched by the latest move highlighted,
                plus the current node id and depth.
              </li>
              <li>
                The <strong>tree</strong>, with one node per generated state. Frontier nodes, visited
                nodes, duplicates and the goal each have their own status colour.
              </li>
              <li>
                The <strong>Frontier</strong> tab (the stack, top first) and the{' '}
                <strong>Explored</strong> tab (the visited set, in visit order).
              </li>
              <li>
                Counters for nodes <strong>generated</strong> and states <strong>explored</strong>,
                the maximum depth reached, and the engine time.
              </li>
            </ul>
            <p>
              The <strong>depth limit</strong> (1–30, default 6) caps how far from the start the
              search may travel. It keeps the tree readable and guarantees that the run ends, at the
              cost of completeness: a solution deeper than the limit is never reached. The rest of
              this page uses exactly the same rules as the visualizer, including the goal test on
              pop.
            </p>

            <dl>
              <div>
                <dt>State</dt>
                <dd>
                  A 9-digit integer read row by row, with 9 for the blank. States are the vertices of
                  the search graph.
                </dd>
              </div>
              <div>
                <dt>Frontier</dt>
                <dd>The stack of nodes that have been generated but not expanded yet.</dd>
              </div>
              <div>
                <dt>Visited</dt>
                <dd>
                  The set of states that have already been expanded. It turns the walk into a finite
                  graph search.
                </dd>
              </div>
              <div>
                <dt>Depth</dt>
                <dd>Number of moves from the root of the search tree to a node.</dd>
              </div>
              <div>
                <dt>Depth limit</dt>
                <dd>
                  The largest depth that may be expanded. Nodes at the limit become leaves, even if
                  they have legal moves.
                </dd>
              </div>
            </dl>

            <Callout title="Graph search, not tree search" tone="note">
              <p>
                Without the visited set the same position could be expanded again and again — or
                forever, because every move can be reversed. The visited set is what turns an
                infinite walk into a finite graph search. The stack alone is not enough.
              </p>
            </Callout>
          </Section>

          <Section id="principle" number={2} title="Principle" eyebrow="The mechanism">
            <p>
              DFS is best understood as a single rule: <strong>always continue from the most
              recently added node</strong>. A last-in, first-out (LIFO) stack enforces that rule.
              Pushing a child puts it on top; popping takes it off again. When a branch runs out of
              new children, the search simply pops the next sibling below it — that is backtracking.
            </p>
            <p>The loop has five phases, which map directly onto the pseudocode:</p>
            <ol>
              <li>
                <strong>Pop</strong> the node on top of the stack.
              </li>
              <li>
                <strong>Reject duplicates.</strong> If its state is already in the visited set, mark
                the node as a duplicate and continue.
              </li>
              <li>
                <strong>Expand.</strong> Add the state to the visited set and count it as explored.
                If it is the goal, stop and walk the parent links back to the root.
              </li>
              <li>
                <strong>Bound.</strong> If the node is at the depth limit, do not generate children.
              </li>
              <li>
                <strong>Generate.</strong> For each legal move, skip the parent and states already
                visited, create a child and push it. Push in reverse move order so the first move
                ends on top.
              </li>
            </ol>

            <Pseudocode />

            <h3>Why each detail matters</h3>
            <ul>
              <li>
                <strong>LIFO is the algorithm.</strong> Replacing the stack with a queue produces
                BFS. The data structure, not a separate rule, decides which node is expanded next.
              </li>
              <li>
                <strong>The goal test happens on pop.</strong> A goal state sitting on the stack is
                only a candidate. The app declares success when it actually expands that node. In
                this implementation the test is inside the expansion step, after the visited check.
              </li>
              <li>
                <strong>Visited is updated at expansion, not at generation.</strong> Two nodes on
                different branches can produce the same state before either one is expanded. Such
                duplicates can still sit on the stack and are discarded by the pop-time check. The{' '}
                <code>explored</code> counter counts unique expansions; <code>generated</code> counts
                every child created.
              </li>
              <li>
                <strong>Parent pruning is explicit.</strong> The parent state is already in the
                visited set, so the visited check would also reject it. Skipping it directly avoids
                an immediate move-and-undo cycle and makes the intent of the code obvious.
              </li>
              <li>
                <strong>Parent links reconstruct the answer.</strong> Each node stores{' '}
                <code>parentId</code>. When the goal is popped, walking those links from goal to root
                gives the solution path without a second search.
              </li>
            </ul>

            <h3>The stack and the tree, step by step</h3>
            <p>
              The diagram follows one short branch. Each card shows the schematic tree on the left
              and the stack on the right. The highlighted stack row is the node that will be popped
              next.
            </p>
            <DfsDiagram />

            <Callout title="The stack is not the whole tree" tone="insight">
              <p>
                At any moment the stack holds the current path&apos;s unexpanded siblings, not every
                node discovered so far. That is why the frontier can stay small while the tree in the
                visualizer grows large.
              </p>
            </Callout>
          </Section>

          <Section id="optimality" number={3} title="Optimality" eyebrow="No shortest-path guarantee">
            <p>
              DFS is <strong>not optimal</strong>. It returns the first goal it pops, not the goal
              reached in the fewest moves. That difference is easy to see in the 8-puzzle, where the
              same start can produce very different path lengths depending on the depth limit.
            </p>

            <div
              className={styles.example}
              role="group"
              aria-label="Worked optimality example"
            >
              <div className={styles.exampleRow}>
                <span className={styles.exampleLabel}>Start</span>
                <div className={styles.exampleValue}>
                  <StateDiagram state={952143786} label="Start state" />
                </div>
              </div>
              <div className={styles.exampleRow}>
                <span className={styles.exampleLabel}>Shortest solution</span>
                <span className={styles.exampleValue}>
                  <span className={styles.exampleCount}>6 moves</span>
                  <span className={styles.moves}>D R U R D D</span>
                </span>
              </div>
              <div className={styles.exampleRow}>
                <span className={styles.exampleLabel}>DFS, limit 14</span>
                <span className={styles.exampleValue}>
                  <span className={styles.exampleCount}>14 moves</span>
                  <span className={styles.moves}>D D R U U R D L D L U R R D</span>
                </span>
              </div>
            </div>

            <p>
              Run this app&apos;s DFS from <code>952143786</code> with the depth limit at 14 and the
              first goal it pops sits at depth 14, after 14 moves and 241 explored states. A 6-move
              solution exists. At limit 6 the same search returns the 6-move path; at limit 30 it
              returns a 30-move path. Same start, same goal, three different answers.
            </p>
            <p>
              The reason is structural. At every step DFS prefers depth over breadth. A branch that
              moves away from the goal can be long, and DFS has no cost model that would make it turn
              back. Only the depth limit stops it. The visited set prevents cycles, not detours.
            </p>
            <p>
              A tempting but wrong conclusion is that the depth limit makes DFS optimal. It does not.
              A low limit can cut off a deep answer and make the reported path shorter, but that is a
              side effect of searching less, not a proof of minimality. The depth limit changes which
              answer is found; it does not add a shortest-path guarantee.
            </p>

            <Callout title="Read the result as “a solution”, not “the best solution”" tone="warning">
              <p>
                The result card reports the first goal this traversal reached. If shortest matters,
                change the strategy — BFS, or iterative deepening — rather than tuning the depth
                limit.
              </p>
            </Callout>
          </Section>

          <Section
            id="completeness"
            number={4}
            title="Completeness"
            eyebrow="Will it find a solution?"
          >
            <p>
              A search is <strong>complete</strong> if it finds a solution whenever one exists. DFS
              with a visited set is complete on a finite graph: no reachable state is expanded twice,
              and every reachable state is eventually generated and popped. If the goal is reachable,
              the search reaches it; if not, the stack empties and the run ends.
            </p>
            <p>
              The 8-puzzle graph is finite. There are 9! = 362,880 arrangements of nine symbols, but
              the blank&apos;s moves generate only even permutations, so exactly half — 9!/2 ={' '}
              {formatNumber(REACHABLE_STATES)} — are reachable from a given start. With each state
              expanded at most once, an unlimited DFS cannot run forever.
            </p>

            <h3>Where the guarantee breaks</h3>
            <p>
              The depth limit makes the search <strong>incomplete</strong> for the puzzle as a whole.
              A solution deeper than <code>m</code> is invisible: every node at the limit is treated
              as a leaf. The app then reports <strong>“not found within depth limit N”</strong>. That
              message does not mean the puzzle is unsolvable; it means this bounded search did not
              reach the goal. In practice, a not-found result is a limit hit.
            </p>
            <p>
              Running out of stack does not prove the puzzle is unsolvable: it proves this bounded
              traversal did not reach the goal. The visited set adds a second, subtler effect. A
              state is marked visited the first time it is popped, even if that happens on a long
              detour. If the same state later appears on a shorter path, it is pruned as a
              duplicate, so its shallower children are never generated. On the default board the
              5-move solution is found with a limit of 6, yet a limit of 13 can exhaust the bounded
              tree without generating the goal at all. The limit is a hard ceiling on expansion
              depth, not a guarantee that every solution inside the ceiling will be discovered by
              this particular traversal order.
            </p>
            <p>
              The cap also matters for the puzzle as a whole: from the standard goal, the hardest
              8-puzzle states are 31 moves away, and the app caps the limit at 30. Those deepest
              states cannot be solved with any setting. Lower limits are useful for watching the
              mechanics, not for solving arbitrary puzzles.
            </p>

            <Callout title="Bounded completeness" tone="note">
              <p>
                A depth limit makes DFS incomplete for the puzzle as a whole, and graph-search
                pruning can also hide a shallow solution behind a longer first visit. Unlimited DFS
                with cycle pruning is complete on this finite graph; a bounded run is not.
              </p>
            </Callout>
          </Section>

          <Section
            id="time-complexity"
            number={5}
            title="Time complexity"
            eyebrow="How the work grows"
          >
            <p>
              In the usual tree-search notation, DFS takes <strong>O(b^m)</strong> time, where{' '}
              <code>b</code> is the branching factor (children per expanded node after pruning) and{' '}
              <code>m</code> is the depth limit. Without pruning, the search may generate a complete
              b-ary tree down to depth m.
            </p>
            <p>
              On the 8-puzzle <code>b</code> is small. A blank in a corner has two moves, on an edge
              three, and in the centre four, so the average number of legal moves is (4·2 + 4·3 +
              1·4)/9 = 24/9 ≈ 2.67. After discarding the parent and states already visited, each
              expansion pushes fewer children than that; <code>b ≤ 4</code> is the safe upper bound.
              A typical run therefore behaves like a narrow tree, not a four-way explosion.
            </p>
            <p>
              The visited set changes the bound. The search tree may contain duplicates, but only{' '}
              {formatNumber(REACHABLE_STATES)} distinct states can ever be expanded, and each
              expansion looks at no more than four moves. So the real worst case is bounded by the
              size of the reachable graph — at most {formatNumber(REACHABLE_STATES)} expansions and
              roughly four times as many edge examinations — while O(b^m) remains the depth-limited
              tree bound. For a fixed limit both descriptions are valid; the graph bound explains why
              an unlimited run terminates.
            </p>
            <p>
              The app&apos;s counters make the growth visible. <code>generated</code> is the number of
              child nodes created (the root is created too, so generated ≥ explored).{' '}
              <code>explored</code> is the number of distinct states added to the visited set. Watch
              generated rise faster than explored: duplicates and pruned children still cost a
              creation, but only unique states count as expansions.
            </p>
            <p>
              Depth is the lever. At the default limit of 6 the tree is small enough to inspect node
              by node. Above 12 the app shows a warning: the node count, the SVG tree and the undo
              history grow quickly even when the engine itself is still fast. The timer measures only
              engine time (<code>performance.now()</code> deltas around each step), so it does not
              include rendering.
            </p>

            <ComplexityTable />

            <Callout title="The limit sits in the exponent" tone="insight">
              <p>
                Raising the depth limit from 12 to 20 is not a 67% increase in work. It changes the
                shape of the search: the number of possible paths grows roughly by another factor of
                b for every extra level.
              </p>
            </Callout>
          </Section>

          <Section
            id="space-complexity"
            number={6}
            title="Space complexity"
            eyebrow="What is kept in memory"
          >
            <p>
              The frontier stack is the memory-efficient part. Along the current path, each expanded
              node leaves at most <code>b − 1</code> unexpanded siblings on the stack. With depth{' '}
              <code>m</code> that is <code>(b − 1)·m + 1</code> node ids, i.e. <strong>O(b·m)</strong>.
              At <code>b = 4</code> and the maximum limit of 30 that is at most 91 ids — a few hundred
              bytes, independent of how wide the tree gets.
            </p>
            <p>
              The visited set is a different story. It stores up to {formatNumber(REACHABLE_STATES)}{' '}
              states. As raw 32-bit integers that is about 0.7 MB, but a JavaScript <code>Set</code>,
              the <code>visited</code> array in each snapshot, and garbage-collector overhead make the
              real footprint larger. This is the price of never expanding a state twice.
            </p>
            <p>
              This app also keeps a node record for every generated node — id, state, parent id,
              depth, move, status and child ids — because the tree view, the step inspector,
              undo/redo and the solution replay all need them. That table grows with the number of
              generated nodes, up to O(V), and is usually the dominant memory term in a full run. The
              honest accounting is therefore: stack <strong>O(b·m)</strong>, visited set{' '}
              <strong>O(V)</strong>, node records <strong>O(V)</strong>.
            </p>
            <p>
              Compare BFS. Its frontier holds every node at the current depth,{' '}
              <strong>O(b^d)</strong>, which can be tens of thousands of states even when DFS&apos;s
              stack holds only a path. Both searches still need a visited set of the same order. The
              DFS advantage is <strong>frontier memory</strong>, not total memory.
            </p>

            <Callout title="Why keep all three structures?" tone="note">
              <p>
                The stack says what to try next, the visited set says what not to repeat, and the
                parent links say how we got here. Dropping any one breaks termination, correctness or
                the path display.
              </p>
            </Callout>
          </Section>

          <Section
            id="advantages"
            number={7}
            title="Advantages and limitations"
            eyebrow="When to use DFS"
          >
            <p>
              DFS is a good fit when memory is tight, the solution may be deep, and any solution is
              acceptable. It is a poor fit when “shortest” matters or when a wrong branch can be
              enormous.
            </p>

            <div className={styles.versus}>
              <div className={styles.versusCard}>
                <h3>Depth-first search</h3>
                <ul className={styles.versusList}>
                  <li>Frontier memory O(b·m), not O(b^d).</li>
                  <li>Simple: one stack, one visited set, parent links.</li>
                  <li>Reaches deep solutions without storing a wide frontier.</li>
                  <li>Easy to bound and to visualize; the stack is the current path.</li>
                  <li>Complete on finite graphs with cycle pruning when unlimited.</li>
                </ul>
              </div>
              <div className={styles.versusCard}>
                <h3>Breadth-first search</h3>
                <ul className={styles.versusList}>
                  <li>Returns a shortest solution when every move costs the same.</li>
                  <li>Complete on finite graphs.</li>
                  <li>Frontier O(b^d) can be far larger than the DFS stack.</li>
                  <li>Memory, not time, is usually the binding constraint.</li>
                  <li>Better when the goal is shallow or shortest matters.</li>
                </ul>
              </div>
            </div>

            <p>
              DFS can also waste time in a deep, irrelevant branch: it will not reconsider that
              choice until the branch is exhausted. Cycle pruning is mandatory, not optional, because
              every puzzle move can be reversed. And a depth limit trades completeness for
              termination and readability — useful for a visualizer, dangerous as a solver.
            </p>
            <p>
              For this app DFS is the right teaching choice: the stack maps directly onto the
              tree&apos;s current path, and the depth limit keeps both the run and the drawing finite.
              If the goal were the shortest solution, BFS or iterative deepening would be the right
              tool; a larger depth limit will not turn DFS into a shortest-path search.
            </p>
          </Section>

          <footer className={styles.footer} style={{width:'780px'}}>
            <div>
              <p className={styles.footerTitle}>See it in motion</p>
              <p className={styles.footerText}>
                Step through the same algorithm on your own start and goal boards, with the stack,
                visited set and tree updating live.
              </p>
            </div>
            <Link to="/visualizer" className={styles.cta}>
              Open the visualizer
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </footer>
        </article>
      </div>
    </main>
  )
}
