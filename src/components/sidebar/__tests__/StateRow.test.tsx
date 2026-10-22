import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import StateRow from '../StateRow'

describe('StateRow', () => {
  it('shows the board, status and depth without state notation', () => {
    render(<StateRow id={12} state={1234} depth={3} status="frontier" isNext order={4} />)
    expect(screen.queryByText('000001234')).not.toBeInTheDocument()
    expect(screen.getByText('frontier')).toBeInTheDocument()
    expect(screen.getByText('depth 3')).toBeInTheDocument()
    expect(screen.getByText('#4')).toBeInTheDocument()
    expect(screen.getByText('next')).toBeInTheDocument()
  })

  it('exposes an accessible label and fires interaction handlers', () => {
    const onClick = vi.fn()
    const onHover = vi.fn()
    const onLeave = vi.fn()
    render(
      <StateRow
        id={7}
        state={987654321}
        depth={2}
        status="visited"
        onClick={onClick}
        onHover={onHover}
        onLeave={onLeave}
      />,
    )
    const row = screen.getByRole('button')
    expect(row).toHaveAccessibleName('Node 7, depth 2, visited')
    fireEvent.click(row)
    fireEvent.mouseEnter(row)
    fireEvent.mouseLeave(row)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onHover).toHaveBeenCalledTimes(1)
    expect(onLeave).toHaveBeenCalledTimes(1)
  })

  it('marks highlighted rows', () => {
    const { container } = render(
      <StateRow id={1} state={123456789} depth={0} status="visited" highlighted />,
    )
    expect(container.firstChild).toHaveAttribute('data-highlighted', 'true')
  })
})
