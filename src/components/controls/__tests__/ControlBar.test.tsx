import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ControlBar from '../ControlBar'

type Props = ComponentProps<typeof ControlBar>

function setup(overrides: Partial<Props> = {}) {
  const handlers = {
    onStep: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onReset: vi.fn(),
    onRunToEnd: vi.fn(),
    onToggleAutoplay: vi.fn(),
    onSpeedChange: vi.fn(),
    onDepthLimitChange: vi.fn(),
    onRandomize: vi.fn(),
    onSwap: vi.fn(),
  }

  render(
    <ControlBar
      canStep
      canUndo={false}
      canRedo={false}
      running={false}
      hasResult={false}
      dirty={false}
      speed={1}
      depthLimit={6}
      {...handlers}
      {...overrides}
    />,
  )

  return handlers
}

describe('ControlBar', () => {
  it('wires every playback and setup action', async () => {
    const user = userEvent.setup()
    const handlers = setup({ canUndo: true, canRedo: true })

    await user.click(screen.getByRole('button', { name: 'Randomize board' }))
    await user.click(screen.getByRole('button', { name: 'Swap start and goal' }))
    await user.click(screen.getByRole('button', { name: 'Reset search' }))
    await user.click(screen.getByRole('button', { name: 'Undo step' }))
    await user.click(screen.getByRole('button', { name: 'Step forward' }))
    await user.click(screen.getByRole('button', { name: 'Redo step' }))
    await user.click(screen.getByRole('button', { name: 'Auto-play' }))
    await user.click(screen.getByRole('button', { name: 'Run to end' }))

    expect(handlers.onRandomize).toHaveBeenCalledTimes(1)
    expect(handlers.onSwap).toHaveBeenCalledTimes(1)
    expect(handlers.onReset).toHaveBeenCalledTimes(1)
    expect(handlers.onUndo).toHaveBeenCalledTimes(1)
    expect(handlers.onStep).toHaveBeenCalledTimes(1)
    expect(handlers.onRedo).toHaveBeenCalledTimes(1)
    expect(handlers.onToggleAutoplay).toHaveBeenCalledTimes(1)
    expect(handlers.onRunToEnd).toHaveBeenCalledTimes(1)
  })

  it('disables step when canStep is false', () => {
    setup({ canStep: false })
    expect(screen.getByRole('button', { name: 'Step forward' })).toBeDisabled()
  })

  it('disables step and the search actions while dirty, and shows the hint', () => {
    setup({ dirty: true, canStep: true, canUndo: true, canRedo: true })

    expect(screen.getByRole('button', { name: 'Step forward' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Undo step' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Redo step' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Reset search' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Run to end' })).toBeDisabled()
    expect(screen.getByText('Start the search to apply board changes')).toBeInTheDocument()
  })

  it('reflects the running state on the auto-play toggle', async () => {
    const user = userEvent.setup()
    const { onToggleAutoplay } = setup({ running: true })

    const toggle = screen.getByRole('button', { name: 'Pause auto-play' })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await user.click(toggle)
    expect(onToggleAutoplay).toHaveBeenCalledTimes(1)
  })

  it('changes speed through the presets', async () => {
    const user = userEvent.setup()
    const { onSpeedChange } = setup()

    await user.click(screen.getByRole('button', { name: '2×' }))
    expect(onSpeedChange).toHaveBeenCalledWith(2)
  })

  it.each([
    ['99', 30],
    ['0', 1],
    ['18', 18],
  ])('clamps depth %s to %i on Enter', async (draft, expected) => {
    const user = userEvent.setup()
    const { onDepthLimitChange } = setup()

    const input = screen.getByLabelText('Depth limit')
    await user.clear(input)
    await user.type(input, draft)
    await user.keyboard('{Enter}')

    expect(onDepthLimitChange).toHaveBeenCalledWith(expected)
  })

  it('warns above depth 12 and stays quiet at the threshold', () => {
    const { unmount } = render(<ControlBar
      canStep
      canUndo={false}
      canRedo={false}
      running={false}
      hasResult={false}
      dirty={false}
      speed={1}
      depthLimit={13}
      onStep={() => {}}
      onUndo={() => {}}
      onRedo={() => {}}
      onReset={() => {}}
      onRunToEnd={() => {}}
      onToggleAutoplay={() => {}}
      onSpeedChange={() => {}}
      onDepthLimitChange={() => {}}
      onRandomize={() => {}}
      onSwap={() => {}}
    />)

    expect(screen.getByText(/Depth 13 will generate very large trees/)).toBeInTheDocument()
    unmount()

    render(<ControlBar
      canStep
      canUndo={false}
      canRedo={false}
      running={false}
      hasResult={false}
      dirty={false}
      speed={1}
      depthLimit={12}
      onStep={() => {}}
      onUndo={() => {}}
      onRedo={() => {}}
      onReset={() => {}}
      onRunToEnd={() => {}}
      onToggleAutoplay={() => {}}
      onSpeedChange={() => {}}
      onDepthLimitChange={() => {}}
      onRandomize={() => {}}
      onSwap={() => {}}
    />)

    expect(screen.queryByText(/very large trees/)).not.toBeInTheDocument()
  })
})
