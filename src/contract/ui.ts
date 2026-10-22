import type { ReactNode } from 'react'
import type { Result, SearchConfig, SearchSnapshot } from './types'

/**
 * FROZEN CONTRACT (Checkpoint 0).
 *
 * Cross-track UI types. Each component track implements the matching component
 * against these props; the integration track wires stores into them.
 */

export type Theme = 'light' | 'dark'
export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'
export type BoardSize = 'sm' | 'md' | 'lg'
export type ActionKind = 'step' | 'undo' | 'redo' | 'reset'

/* ---------------------------------- board --------------------------------- */

export interface PuzzleBoardProps {
  /** 9-digit board integer. */
  state: number
  size?: BoardSize
  /** Highlighted tile (editor selection or replay position). */
  selectedIndex?: number | null
  /** Click handler; when provided tiles become interactive buttons. */
  onTileSelect?: (index: number) => void
  /** Indices to outline, e.g. the tiles touched by the current move. */
  highlightIndices?: readonly number[]
  /** Indices to fade, e.g. the tiles not part of the solution. */
  dimIndices?: readonly number[]
  /** Optional caption read by assistive technology. */
  label?: string
  disabled?: boolean
}

export interface BoardEditorProps {
  state: number
  /** Visible label, e.g. "Initial state". */
  label: string
  onChange: (state: number) => void
  error?: string | null
  disabled?: boolean
  size?: BoardSize
  /** Extra hint line shown under the board. */
  hint?: string
}

export interface StartGoalPanelProps {
  start: number
  goal: number
  onStartChange: (state: number) => void
  onGoalChange: (state: number) => void
  onStart: () => void
  solvable: boolean
  /** Boards differ from the running search configuration. */
  dirty: boolean
  error?: string | null
  disabled?: boolean
}

/* -------------------------------- controls -------------------------------- */

export interface ControlBarProps {
  canStep: boolean
  canUndo: boolean
  canRedo: boolean
  running: boolean
  hasResult: boolean
  dirty: boolean
  speed: number
  depthLimit: number
  onStep: () => void
  onUndo: () => void
  onRedo: () => void
  onReset: () => void
  onRunToEnd: () => void
  onToggleAutoplay: () => void
  onSpeedChange: (speed: number) => void
  onDepthLimitChange: (depth: number) => void
  onRandomize: () => void
  onSwap: () => void
}

export interface TimerChipProps {
  elapsedMs: number
  running?: boolean
}

export interface HeaderProps {
  elapsedMs: number
  running: boolean
  theme: Theme
  onThemeChange: (theme: Theme) => void
  sidebarOpen: boolean
  onToggleSidebar: () => void
  /** Hide the sidebar toggle on pages without a sidebar. */
  showSidebarToggle?: boolean
  /** Hide the engine timer on pages that do not run a search. */
  showTimer?: boolean
}

/* ---------------------------------- tree ---------------------------------- */

export interface TreeViewState {
  hoveredId: number | null
  selectedId: number | null
  /** Set by the sidebar; TreeCanvas pans to it and clears it. */
  cameraTargetId: number | null
  setHovered: (id: number | null) => void
  setSelected: (id: number | null) => void
  focusNode: (id: number, snapshot: SearchSnapshot) => void
  clearCameraTarget: () => void
  reset: () => void
}

export interface TreeCanvasProps {
  snapshot: SearchSnapshot
  reducedMotion: boolean
  /** Optional search-list deck rendered in the canvas' top-right panel stack. */
  searchList?: ReactNode
}

/* --------------------------------- info ----------------------------------- */

export interface ActionNarration {
  kind: ActionKind
  poppedId: number | null
  /** Children pushed by the step. */
  pushed: number
  /** Neighbours skipped because they were already visited or the parent. */
  pruned: number
  /** True when the popped state was newly visited. */
  visited: boolean
}

export interface StepInspectorProps {
  snapshot: SearchSnapshot
  narration: ActionNarration | null
}

export interface ResultCardProps {
  result: Result | null
  config: SearchConfig
  replaying: boolean
  onReplay: () => void
  reducedMotion?: boolean
}

export interface StatBadgeProps {
  label: string
  value: string | number
  tone?: Tone
  icon?: ReactNode
}

/* --------------------------------- sidebar -------------------------------- */

export interface FrontierListProps {
  snapshot: SearchSnapshot
}

export interface ExploredListProps {
  snapshot: SearchSnapshot
}

export interface SidebarShellProps {
  open: boolean
  onToggle: () => void
  snapshot: SearchSnapshot
}
