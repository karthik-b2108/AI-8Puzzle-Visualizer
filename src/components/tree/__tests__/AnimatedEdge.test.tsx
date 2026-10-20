import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Position } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import type { TreeEdgeData } from '../../../hooks/useTreeLayout'
import { AnimatedEdge } from '../AnimatedEdge'

function edgeProps(data: TreeEdgeData): EdgeProps {
  return {
    id: 'e-0-1',
    source: '0',
    target: '1',
    sourceX: 0,
    sourceY: 66,
    targetX: 0,
    targetY: 96,
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    data,
  } as EdgeProps
}

function renderEdge(data: TreeEdgeData) {
  return render(
    <svg>
      <AnimatedEdge {...edgeProps(data)} />
    </svg>,
  )
}

describe('AnimatedEdge', () => {
  it('renders the base edge and marks solution edges with the sequence overlay', () => {
    const { container } = renderEdge({
      move: 'U',
      solution: true,
      solutionIndex: 3,
      status: 'visited',
    })

    expect(container.querySelector('.react-flow__edge-path')).not.toBeNull()
    const sequence = container.querySelector('path[class*="solutionSeq"]')
    expect(sequence).not.toBeNull()
    expect(sequence?.getAttribute('d')).toBeTruthy()
    expect((sequence as SVGPathElement).style.animationDelay).toBe('360ms')
    expect(container.querySelector('linearGradient')).not.toBeNull()
  })

  it('hides the sequence overlay for non-solution edges', () => {
    const { container } = renderEdge({ move: 'D', solution: false, status: 'frontier' })
    expect(container.querySelector('path[class*="solutionSeq"]')).toBeNull()
    expect(container.querySelector('linearGradient')).toBeNull()
  })

  it('renders an upward backtrack pulse with its delay', () => {
    const { container } = renderEdge({
      move: 'D',
      solution: false,
      status: 'frontier',
      pulse: true,
      pulseToken: 7,
      pulseDirection: 'up',
      pulseDelay: 90,
    })

    const pulse = container.querySelector('path[class*="pulse"]')
    expect(pulse).not.toBeNull()
    expect(pulse?.getAttribute('class')).toContain('pulseUp')
    expect((pulse as SVGPathElement).style.animationDelay).toBe('90ms')
  })

  it('renders a downward pulse and no pulse when the flag is off', () => {
    const down = renderEdge({
      move: 'U',
      solution: false,
      status: 'visited',
      pulse: true,
      pulseToken: 2,
      pulseDirection: 'down',
    })
    expect(down.container.querySelector('path[class*="pulse"]')?.getAttribute('class')).toContain(
      'pulseDown',
    )
    down.unmount()

    const none = renderEdge({ move: 'U', solution: false, status: 'visited' })
    expect(none.container.querySelector('path[class*="pulse"]')).toBeNull()
  })
})
