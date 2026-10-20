import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { SearchSnapshot } from '../../../contract/types'
import type { StepEvent } from '../../../engine/dfs'
import found from '../../../contract/fixtures/found.json'
import initial from '../../../contract/fixtures/initial.json'
import StepInspector from '../StepInspector'

const foundSnapshot = found as unknown as SearchSnapshot
const initialSnapshot = initial as unknown as SearchSnapshot

const stepped: StepEvent = { kind: 'step', poppedId: 76, pushed: 0, pruned: 0, visited: true }

describe('StepInspector', () => {
  it('shows the current node, its depth and its parent', () => {
    render(<StepInspector snapshot={foundSnapshot} narration={stepped} />)

    expect(screen.getByRole('heading', { name: 'Step inspector' })).toBeInTheDocument()
    expect(screen.getByText('depth 5')).toBeInTheDocument()
    expect(screen.getAllByText('123456789').length).toBeGreaterThan(0)
    expect(screen.getByText('0x75BCD15')).toBeInTheDocument()
    expect(screen.getByText('#76')).toBeInTheDocument()
    expect(screen.getByLabelText('Current node, state 123456789')).toBeInTheDocument()
    expect(screen.getByLabelText('Parent node')).toBeInTheDocument()
    expect(screen.getByText('123459786')).toBeInTheDocument()
    expect(screen.getByText(/Down/)).toBeInTheDocument()
  })

  it('narrates the last step in a polite live region', () => {
    render(<StepInspector snapshot={foundSnapshot} narration={stepped} />)

    const narration = screen.getByText('Popped 123456789, pushed 0 children.')
    expect(narration).toHaveAttribute('aria-live', 'polite')
    expect(narration).toHaveAttribute('aria-atomic', 'true')
  })

  it('explains a pruned duplicate', () => {
    render(
      <StepInspector
        snapshot={foundSnapshot}
        narration={{ ...stepped, poppedId: 67, visited: false, pushed: 0 }}
      />,
    )
    expect(screen.getByText(/already visited, so it was pruned/)).toBeInTheDocument()
  })

  it('shows an empty state before the first step', () => {
    render(<StepInspector snapshot={initialSnapshot} narration={null} />)

    expect(screen.getByText(/No step yet/)).toBeInTheDocument()
    expect(screen.getByText(/Press/)).toBeInTheDocument()
  })
})
