import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import BoardEditor from '../BoardEditor'

describe('BoardEditor', () => {
  it('swaps two clicked tiles and reports the 9-digit state', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<BoardEditor state={123456789} label="Initial state" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Tile 1, row 1, column 1' }))
    expect(screen.getByText('Selected tile — pick another to swap')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Tile 2, row 1, column 2' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(213456789)
    expect(screen.queryByText('Selected tile — pick another to swap')).not.toBeInTheDocument()
  })

  it('swaps the blank like any other tile', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<BoardEditor state={123745896} label="Initial state" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Blank, row 3, column 2' }))
    await user.click(screen.getByRole('button', { name: 'Tile 1, row 1, column 1' }))

    expect(onChange).toHaveBeenCalledWith(923745816)
  })

  it('deselects when the selected tile is clicked again', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<BoardEditor state={123456789} label="Initial state" onChange={onChange} />)

    const tile = screen.getByRole('button', { name: 'Tile 1, row 1, column 1' })
    await user.click(tile)
    await user.click(tile)

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByText(/Selected tile/)).not.toBeInTheDocument()
  })

  it('cancels the selection with Escape', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<BoardEditor state={123456789} label="Initial state" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Tile 1, row 1, column 1' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByText(/Selected tile/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Tile 2, row 1, column 2' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('blocks swaps while disabled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<BoardEditor state={123456789} label="Initial state" onChange={onChange} disabled />)

    const tiles = screen.getAllByRole('button')
    expect(tiles).toHaveLength(9)
    for (const tile of tiles) expect(tile).toBeDisabled()

    await user.click(tiles[0])
    await user.click(tiles[1])
    expect(onChange).not.toHaveBeenCalled()
  })

  it('announces an inline error', () => {
    render(
      <BoardEditor
        state={123456789}
        label="Initial state"
        onChange={() => {}}
        error="This board is unsolvable."
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('This board is unsolvable.')
  })
})
