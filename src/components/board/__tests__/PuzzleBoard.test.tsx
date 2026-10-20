import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import initial from '../../../contract/fixtures/initial.json'
import PuzzleBoard from '../PuzzleBoard'

const START = initial.config.start

describe('PuzzleBoard', () => {
  it('renders nine cells and shows the blank as a slot, not the digit 9', () => {
    render(<PuzzleBoard state={START} label="Initial puzzle" />)

    const tiles = document.querySelectorAll('[data-tile]')
    expect(tiles).toHaveLength(9)
    expect(tiles[7]).toHaveAttribute('data-blank', 'true')
    expect(tiles[7].textContent).toBe('')
    expect(screen.queryByText('9')).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Initial puzzle' })).toBeInTheDocument()
  })

  it('marks selected, highlighted and dimmed tiles', () => {
    render(
      <PuzzleBoard
        state={START}
        selectedIndex={0}
        highlightIndices={[1]}
        dimIndices={[2]}
        label="Marked puzzle"
      />,
    )

    const tiles = document.querySelectorAll('[data-tile]')
    expect(tiles[0]).toHaveAttribute('data-selected', 'true')
    expect(tiles[0].className).toMatch(/selected/)
    expect(tiles[1]).toHaveAttribute('data-highlighted', 'true')
    expect(tiles[1].className).toMatch(/highlighted/)
    expect(tiles[2]).toHaveAttribute('data-dimmed', 'true')
    expect(tiles[2].className).toMatch(/dimmed/)
  })

  it('turns tiles into buttons when a select handler is supplied', async () => {
    const user = userEvent.setup()
    const onTileSelect = vi.fn()
    render(<PuzzleBoard state={START} onTileSelect={onTileSelect} />)

    await user.click(screen.getByRole('button', { name: 'Blank, row 3, column 2' }))
    expect(onTileSelect).toHaveBeenCalledWith(7)
  })

  it('disables interaction when disabled', () => {
    render(<PuzzleBoard state={START} onTileSelect={() => {}} disabled />)

    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled()
    }
  })
})
