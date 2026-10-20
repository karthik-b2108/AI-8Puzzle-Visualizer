# DFS 8-Puzzle Visualizer

An interactive, animated visualization of **depth-first search** on the 8-puzzle. Step through the
search one node at a time, watch the state-space tree grow, collapse deep subtrees on demand, and
compare the frontier with the explored set.

Built with Vite, React 18, TypeScript, React Flow (`@xyflow/react`), Zustand and Framer Motion.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Production build and preview:

```bash
npm run build
npm run preview
```

Tests and type checking:

```bash
npm test           # vitest run
npm run typecheck
npm run lint
```

## What you can do

- **Edit both boards.** Click one tile, then another, to swap them. The blank (9) is a tile too;
  `Esc` cancels a selection. The goal board is fully editable.
- **Start a search.** Board edits are staged — press **Start search** to configure and reset the
  engine. Unsovable start/goal pairs are blocked with an inline explanation.
- **Step, undo, redo, reset, auto-play and run to end.** Every action produces a new immutable
  snapshot; undo restores the previous snapshot exactly and redo replays the step.
- **Watch the tree.** New children animate in, the camera follows the current node, and the
  solution path glows. Deep finished subtrees collapse automatically when the tree grows large;
  the `+N` badge on a collapsed node expands one level (double-click expands the subtree).
- **Inspect the search.** The step inspector shows the current node, its depth, its parent, the move
  that produced it, and a one-line narration of what the engine just did.
- **Browse the frontier and explored set.** The sidebar is virtualized, searchable by digits, and
  linked to the tree (hover highlights, click pans).
- **Replay a solution.** The result card reports moves, generated/explored nodes, maximum depth and
  execution time, and can animate the solution on a board.
- **Learn the algorithm.** The Learn page explains the principle, optimality, completeness,
  complexity and trade-offs, with pseudocode and diagrams.

Keyboard shortcuts: `Space` step, `←` undo, `→` redo, `A` auto-play, `R` reset, `[` toggle sidebar.

## Project layout

```
src/
├─ contract/        Frozen types, store interface, shared UI props, fixtures
├─ engine/          Pure TypeScript: codec, moves, solvability, DFS, metrics
├─ store/           Zustand stores: search, settings, tree view
├─ components/      layout · controls · board · tree · info · sidebar · learn
├─ hooks/           autoplay/hotkeys/layout/camera/replay/reduced-motion
├─ routes/          VisualizerPage, LearnPage
├─ styles/          tokens.css + global.css (+ CSS modules)
└─ utils/           formatting and direction helpers
```

The engine is deliberately framework-free. A search is a mutable controller that returns a
`SearchSnapshot` after each action; the store simply publishes that snapshot to React. The stack is
an array (top = last element), the visited set is a `Set` mirrored as an ordered array in snapshots,
and every node keeps a parent id so the path and the tree can be reconstructed.

## Search semantics

- A board is a 9-digit integer; digit `y` is the tile on square `y`, and `9` is the blank.
- Neighbours are generated in **U, D, L, R** order and pushed in reverse so the first neighbour is
  popped first.
- A popped state that has already been visited is marked `duplicate` and pruned. Otherwise it is
  added to the visited set and, if it is not the goal, its children are generated (skipping the
  parent state and already-visited states) up to the depth limit.
- DFS is **not optimal**: the first goal popped may not be on the shortest path. It is complete on
  the finite 8-puzzle graph with cycle pruning, but a depth limit makes it incomplete.
- Engine time is measured with `performance.now()` around each step; rendering time is excluded.

## Development notes

The app was built in phases with parallel git worktrees under `.worktrees/`:

| Branch | Scope |
|---|---|
| `feat/engine` | DFS engine + unit tests |
| `feat/ui-shell` | tokens, header, controls, boards |
| `feat/tree` | React Flow canvas, layout, collapsing |
| `feat/learn` | Learn page |
| `feat/integration` | stores, pages, end-to-end wiring |
| `feat/motion-sidebar` | animations + sidebar |
| `feat/results` | inspector, result card, replay |
| `feat/polish` | hardening, README, release |

`npm run fixtures` regenerates the committed snapshot fixtures in `src/contract/fixtures/` with a
standalone script.

## License

MIT.
