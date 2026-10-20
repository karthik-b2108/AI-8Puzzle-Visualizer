import {
  ArrowLeftRight,
  FastForward,
  Pause,
  Play,
  Redo2,
  RotateCcw,
  Shuffle,
  StepForward,
  Undo2,
} from 'lucide-react'
import type { ControlBarProps } from '../../contract/ui'
import ControlGroup from './ControlGroup'
import DepthLimitField from './DepthLimitField'
import IconButton from './IconButton'
import SpeedSlider from './SpeedSlider'
import styles from './ControlBar.module.css'

/**
 * Setup + playback controls. Purely presentational: every action and every
 * enabled/disabled decision is supplied through ControlBarProps.
 */
export default function ControlBar({
  canStep,
  canUndo,
  canRedo,
  running,
  hasResult,
  dirty,
  speed,
  depthLimit,
  onStep,
  onUndo,
  onRedo,
  onReset,
  onRunToEnd,
  onToggleAutoplay,
  onSpeedChange,
  onDepthLimitChange,
  onRandomize,
  onSwap,
}: ControlBarProps) {
  const stepDisabled = !canStep || dirty
  const undoDisabled = !canUndo || dirty
  const redoDisabled = !canRedo || dirty
  const autoplayDisabled = dirty || hasResult

  return (
    <section className={styles.bar} aria-label="Search controls" data-dirty={String(dirty)}>
      <div className={styles.main}>
        <ControlGroup label="Setup">
          <IconButton
            label="Randomize board"
            tooltip="Randomize the initial state"
            icon={<Shuffle />}
            onClick={onRandomize}
          />
          <IconButton
            label="Swap start and goal"
            tooltip="Swap the initial and goal states"
            icon={<ArrowLeftRight />}
            onClick={onSwap}
          />
          <DepthLimitField value={depthLimit} onChange={onDepthLimitChange} />
        </ControlGroup>

        <span className={styles.divider} role="separator" aria-orientation="vertical" />

        <ControlGroup label="Playback">
          <IconButton
            label="Reset search"
            tooltip={dirty ? 'Reset the search — start it to apply board changes' : 'Reset the search'}
            icon={<RotateCcw />}
            hotkey="R"
            disabled={dirty}
            onClick={onReset}
          />
          <IconButton
            label="Undo step"
            tooltip={dirty ? 'Undo — start the search to apply board changes' : 'Undo the last step'}
            icon={<Undo2 />}
            hotkey="←"
            disabled={undoDisabled}
            onClick={onUndo}
          />
          <IconButton
            label="Step forward"
            tooltip={dirty ? 'Step — start the search to apply board changes' : 'Take one DFS step'}
            icon={<StepForward />}
            hotkey="Space"
            variant="primary"
            disabled={stepDisabled}
            onClick={onStep}
          />
          <IconButton
            label="Redo step"
            tooltip={dirty ? 'Redo — start the search to apply board changes' : 'Redo the last undone step'}
            icon={<Redo2 />}
            hotkey="→"
            disabled={redoDisabled}
            onClick={onRedo}
          />
          <IconButton
            label={running ? 'Pause auto-play' : 'Auto-play'}
            tooltip={running ? 'Pause auto-play' : 'Play automatically'}
            icon={running ? <Pause /> : <Play />}
            hotkey="A"
            active={running}
            disabled={autoplayDisabled}
            onClick={onToggleAutoplay}
          />
          <IconButton
            label="Run to end"
            tooltip={dirty ? 'Run to end — start the search to apply board changes' : 'Run the search to completion'}
            icon={<FastForward />}
            disabled={hasResult || dirty}
            onClick={onRunToEnd}
          />
        </ControlGroup>

        <div className={styles.speed}>
          <SpeedSlider speed={speed} onChange={onSpeedChange} />
        </div>
      </div>

      {dirty ? (
        <p className={styles.hint} role="status">
          Start the search to apply board changes
        </p>
      ) : null}
    </section>
  )
}
