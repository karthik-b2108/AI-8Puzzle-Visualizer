import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SearchSnapshot } from '../../../contract/types'
import found from '../../../contract/fixtures/found.json'
import notFound from '../../../contract/fixtures/not-found.json'
import ResultCard from '../ResultCard'

const foundSnapshot = found as unknown as SearchSnapshot
const notFoundSnapshot = notFound as unknown as SearchSnapshot

const foundResult = foundSnapshot.result!
const notFoundResult = notFoundSnapshot.result!

describe('ResultCard', () => {
  it('reports all five metrics for a found solution', () => {
    render(
      <ResultCard
        result={foundResult}
        config={foundSnapshot.config}
        replaying={false}
        onReplay={() => undefined}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Goal reached' })).toBeInTheDocument()
    expect(screen.getByText('Solution in 5 moves.')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('78')).toBeInTheDocument()
    expect(screen.getByText('77')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('0 ms')).toBeInTheDocument()
  })

  it('offers replay and disables it while replaying', () => {
    const onReplay = vi.fn()
    const { rerender } = render(
      <ResultCard
        result={foundResult}
        config={foundSnapshot.config}
        replaying={false}
        onReplay={onReplay}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /replay solution/i }))
    expect(onReplay).toHaveBeenCalledTimes(1)

    rerender(
      <ResultCard
        result={foundResult}
        config={foundSnapshot.config}
        replaying
        onReplay={onReplay}
      />,
    )
    expect(screen.getByRole('button', { name: /replaying/i })).toBeDisabled()
  })

  it('shows the depth limit and no replay button when not found', () => {
    render(
      <ResultCard
        result={notFoundResult}
        config={notFoundSnapshot.config}
        replaying={false}
        onReplay={() => undefined}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Not found' })).toBeInTheDocument()
    expect(screen.getByText('Not found within depth limit 3.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /replay/i })).not.toBeInTheDocument()
  })

  it('marks the card for reduced motion', () => {
    const { container } = render(
      <ResultCard
        result={foundResult}
        config={foundSnapshot.config}
        replaying={false}
        onReplay={() => undefined}
        reducedMotion
      />,
    )
    expect(container.firstElementChild).toHaveAttribute('data-reduced-motion', 'true')
  })

  it('announces the outcome through a status region', () => {
    render(
      <ResultCard
        result={foundResult}
        config={foundSnapshot.config}
        replaying={false}
        onReplay={() => undefined}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Solution in 5 moves.')
  })
})
