import type { ComponentProps } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import initial from '../../../contract/fixtures/initial.json'
import StartGoalPanel from '../StartGoalPanel'

function setup(overrides: Partial<ComponentProps<typeof StartGoalPanel>> = {}) {
  const handlers = {
    onStartChange: vi.fn(),
    onGoalChange: vi.fn(),
    onStart: vi.fn(),
  }
  render(
    <StartGoalPanel
      start={initial.config.start}
      goal={initial.config.goal}
      solvable
      dirty={false}
      {...handlers}
      {...overrides}
    />,
  )
  return handlers
}

describe('StartGoalPanel', () => {
  it('disables Start and shows the error for an unsolvable pair', () => {
    setup({ solvable: false, error: 'These boards cannot reach each other.' })

    expect(screen.getByRole('button', { name: /start search/i })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('These boards cannot reach each other.')
  })

  it('shows a fallback explanation when unsolvable without an explicit error', () => {
    setup({ solvable: false })

    expect(screen.getByRole('alert')).toHaveTextContent(/unsolvable/i)
  })

  it('calls onStart when the pair is solvable', async () => {
    const user = userEvent.setup()
    const { onStart } = setup()

    const button = screen.getByRole('button', { name: /start search/i })
    expect(button).toBeEnabled()
    await user.click(button)
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('shows the dirty hint', () => {
    setup({ dirty: true })
    expect(screen.getByText('Start the search to apply board changes')).toBeInTheDocument()
  })

  it('edits the goal board through the click-to-swap editor', async () => {
    const user = userEvent.setup()
    const { onGoalChange } = setup()

    const goal = within(screen.getByRole('region', { name: 'Goal state' }))
    await user.click(goal.getByRole('button', { name: 'Tile 1, row 1, column 1' }))
    await user.click(goal.getByRole('button', { name: 'Tile 2, row 1, column 2' }))

    // The goal (123456789) becomes 213456789; the start editor keeps its own selection state.
    expect(onGoalChange).toHaveBeenCalledWith(213456789)
  })
})
