import { useCallback, useEffect, useMemo } from 'react'
import { X } from 'lucide-react'
import ControlBar from '../components/controls/ControlBar'
import ResultCard from '../components/info/ResultCard'
import StepInspector from '../components/info/StepInspector'
import StartGoalPanel from '../components/board/StartGoalPanel'
import PuzzleBoard from '../components/board/PuzzleBoard'
import SidebarShell from '../components/sidebar/SidebarShell'
import TreeCanvas from '../components/tree/TreeCanvas'
import { useHotkeys } from '../hooks/useHotkeys'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useReplay } from '../hooks/useReplay'
import { isSolvable } from '../engine/solvable'
import { useSearchStore } from '../store/useSearchStore'
import { useSettingsStore } from '../store/useSettingsStore'
import styles from './VisualizerPage.module.css'

const UNREACHABLE =
  'Unreachable pair: the 8-puzzle splits into two parity classes. Swap two tiles (or swap the boards) to put the start and goal in the same class.'

export default function VisualizerPage() {
  const snapshot = useSearchStore((state) => state.snapshot)
  const lastAction = useSearchStore((state) => state.lastAction)
  const autoplay = useSearchStore((state) => state.autoplay)
  const configure = useSearchStore((state) => state.configure)
  const step = useSearchStore((state) => state.step)
  const undo = useSearchStore((state) => state.undo)
  const redo = useSearchStore((state) => state.redo)
  const reset = useSearchStore((state) => state.reset)
  const runToEnd = useSearchStore((state) => state.runToEnd)
  const setAutoplay = useSearchStore((state) => state.setAutoplay)

  const start = useSettingsStore((state) => state.start)
  const goal = useSettingsStore((state) => state.goal)
  const depthLimit = useSettingsStore((state) => state.depthLimit)
  const speed = useSettingsStore((state) => state.speed)
  const followCamera = useSettingsStore((state) => state.followCamera)
  const setFollowCamera = useSettingsStore((state) => state.setFollowCamera)
  const sidebarOpen = useSettingsStore((state) => state.sidebarOpen)
  const setStart = useSettingsStore((state) => state.setStart)
  const setGoal = useSettingsStore((state) => state.setGoal)
  const setSpeed = useSettingsStore((state) => state.setSpeed)
  const setDepthLimit = useSettingsStore((state) => state.setDepthLimit)
  const randomizeStart = useSettingsStore((state) => state.randomizeStart)
  const swapBoards = useSettingsStore((state) => state.swapBoards)
  const toggleSidebar = useSettingsStore((state) => state.toggleSidebar)

  const reducedMotion = useReducedMotion()

  // Apply persisted settings to the engine on first mount.
  useEffect(() => {
    const settings = useSettingsStore.getState()
    const config = useSearchStore.getState().snapshot.config
    if (
      config.start !== settings.start ||
      config.goal !== settings.goal ||
      config.depthLimit !== settings.depthLimit
    ) {
      configure({ start: settings.start, goal: settings.goal, depthLimit: settings.depthLimit })
    }
  }, [configure])

  useEffect(() => {
    useSearchStore.getState().setSpeed(speed)
  }, [speed])

  const solvable = useMemo(() => isSolvable(start, goal), [start, goal])
  const dirty =
    start !== snapshot.config.start ||
    goal !== snapshot.config.goal ||
    depthLimit !== snapshot.config.depthLimit
  const busy = autoplay.running
  const canStep = !dirty && !snapshot.result && snapshot.stack.length > 0

  const stopAutoplay = useCallback(() => {
    if (useSearchStore.getState().autoplay.running) setAutoplay(false)
  }, [setAutoplay])

  const handleStart = useCallback(() => {
    stopAutoplay()
    configure({ start, goal, depthLimit })
  }, [configure, depthLimit, goal, start, stopAutoplay])

  const handleStep = useCallback(() => {
    if (dirty) return
    step()
  }, [dirty, step])

  const handleUndo = useCallback(() => {
    if (dirty) return
    undo()
  }, [dirty, undo])

  const handleRedo = useCallback(() => {
    if (dirty) return
    redo()
  }, [dirty, redo])

  const handleReset = useCallback(() => {
    stopAutoplay()
    reset()
  }, [reset, stopAutoplay])

  const handleRunToEnd = useCallback(() => {
    if (dirty) return
    runToEnd()
  }, [dirty, runToEnd])

  const handleToggleAutoplay = useCallback(() => {
    if (dirty) return
    const state = useSearchStore.getState()
    state.setAutoplay(!state.autoplay.running)
  }, [dirty])

  const handleBoardChange = useCallback(
    (which: 'start' | 'goal', next: number) => {
      stopAutoplay()
      if (which === 'start') setStart(next)
      else setGoal(next)
    },
    [setGoal, setStart, stopAutoplay],
  )

  const handleRandomize = useCallback(() => {
    stopAutoplay()
    randomizeStart()
  }, [randomizeStart, stopAutoplay])

  const handleSwapBoards = useCallback(() => {
    stopAutoplay()
    swapBoards()
  }, [stopAutoplay, swapBoards])

  const handleDepthLimit = useCallback(
    (depth: number) => {
      stopAutoplay()
      setDepthLimit(depth)
    },
    [setDepthLimit, stopAutoplay],
  )

  const replay = useReplay(snapshot, {
    reducedMotion,
    frameMs: Math.round(640 / Math.max(0.5, speed)),
  })

  useHotkeys({
    step: handleStep,
    undo: handleUndo,
    redo: handleRedo,
    toggleAutoplay: handleToggleAutoplay,
    reset: handleReset,
    toggleSidebar,
  })

  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <section className={styles.top} aria-label="Setup and current step">
        <StartGoalPanel
          start={start}
          goal={goal}
          onStartChange={(next) => handleBoardChange('start', next)}
          onGoalChange={(next) => handleBoardChange('goal', next)}
          onStart={handleStart}
          solvable={solvable}
          dirty={dirty}
          error={solvable ? null : UNREACHABLE}
          disabled={busy}
        />
        <StepInspector snapshot={snapshot} narration={lastAction} />
      </section>

      <section className={styles.workspace} aria-label="Search tree">
        <SidebarShell open={sidebarOpen} onToggle={toggleSidebar} snapshot={snapshot} />
        <div className={styles.canvasColumn}>
          <ControlBar
            canStep={canStep}
            canUndo={!dirty && snapshot.canUndo}
            canRedo={!dirty && snapshot.canRedo}
            running={autoplay.running}
            hasResult={snapshot.result !== null}
            dirty={dirty}
            speed={speed}
            depthLimit={depthLimit}
            onStep={handleStep}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onReset={handleReset}
            onRunToEnd={handleRunToEnd}
            onToggleAutoplay={handleToggleAutoplay}
            onSpeedChange={setSpeed}
            onDepthLimitChange={handleDepthLimit}
            onRandomize={handleRandomize}
            onSwap={handleSwapBoards}
          />

          <div className={styles.canvasWrap}>
            <TreeCanvas snapshot={snapshot} followCamera={followCamera} reducedMotion={reducedMotion} />

            <div className={styles.cameraToggle}>
              <label className={styles.cameraLabel}>
                <input
                  type="checkbox"
                  checked={followCamera}
                  onChange={(event) => setFollowCamera(event.target.checked)}
                />
                Follow camera
              </label>
            </div>

            <div className={styles.overlays}>
              {snapshot.result ? (
                <ResultCard
                  result={snapshot.result}
                  config={snapshot.config}
                  replaying={replay.replaying}
                  onReplay={replay.start}
                  reducedMotion={reducedMotion}
                />
              ) : null}
            </div>

            {replay.replaying && replay.state !== null ? (
              <div className={styles.replayPanel} role="group" aria-label="Solution replay">
                <header className={styles.replayHeader}>
                  <div>
                    <span className={styles.replayTitle}>Replaying solution</span>
                    <span className={styles.replayCount}>
                      {replay.frame} / {replay.total}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.replayClose}
                    onClick={replay.stop}
                    aria-label="Close solution replay"
                  >
                    <X size={16} />
                  </button>
                </header>
                <PuzzleBoard
                  state={replay.state}
                  size="md"
                  highlightIndices={replay.movedIndices}
                  label={`Replay frame ${replay.frame} of ${replay.total}`}
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  )
}
