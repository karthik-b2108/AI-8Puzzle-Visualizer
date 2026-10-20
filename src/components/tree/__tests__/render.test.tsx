import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReactFlowProvider, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { SearchNode, SearchSnapshot } from '../../../contract/types'
import largeFixture from '../../../contract/fixtures/large-3000.json'
import type { StateNodeData } from '../../../hooks/useTreeLayout'
import { useTreeViewStore } from '../../../store/useTreeViewStore'
import { CollapsedBadge } from '../CollapsedBadge'
import { StateNode } from '../StateNode'
import type { StateNodeType } from '../StateNode'
import { TreeToolbar } from '../TreeToolbar'
import TreeCanvas from '../TreeCanvas'

const large = largeFixture as unknown as SearchSnapshot

class ResizeObserverMock {
  private readonly callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  observe(element: Element) {
    const isFlow = element.classList.contains('react-flow')
    const width = isFlow ? 1200 : 156
    const height = isFlow ? 800 : 66
    this.callback(
      [
        {
          target: element,
          contentRect: { width, height, top: 0, left: 0, bottom: height, right: width, x: 0, y: 0 },
          borderBoxSize: [{ blockSize: height, inlineSize: width }],
          contentBoxSize: [{ blockSize: height, inlineSize: width }],
          devicePixelContentBoxSize: [{ blockSize: height, inlineSize: width }],
        } as unknown as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    )
  }

  unobserve() {}

  disconnect() {}
}

const rect = (width: number, height: number): DOMRect =>
  ({
    width,
    height,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }) as DOMRect

beforeEach(() => {
  useTreeViewStore.getState().reset()
  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  vi.stubGlobal(
    'DOMMatrixReadOnly',
    class {
      m22 = 1
    },
  )
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: Element,
  ) {
    return this.classList.contains('react-flow') ? rect(1200, 800) : rect(156, 66)
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const node: SearchNode = {
  id: 5,
  state: 724596831,
  parentId: 2,
  depth: 3,
  move: 'L',
  status: 'visited',
  children: [6, 7],
}

const nodeData: StateNodeData = {
  node,
  hidden: {
    total: 12,
    byStatus: { frontier: 0, visited: 9, duplicate: 3, goal: 0 },
  },
  isCurrent: true,
  isHovered: false,
  isSelected: false,
  isOnSolutionPath: true,
  isGoal: false,
  isCollapsed: true,
  depth: 3,
  onExpandOne: vi.fn(),
  onExpandSubtree: vi.fn(),
}

function stateNodeProps(): NodeProps<StateNodeType> {
  return {
    id: String(node.id),
    data: nodeData,
    type: 'state',
    dragging: false,
    zIndex: 0,
    selectable: false,
    deletable: false,
    selected: false,
    draggable: false,
    isConnectable: false,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    width: 156,
    height: 66,
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    dragHandle: undefined,
    parentId: undefined,
  } as unknown as NodeProps<StateNodeType>
}

describe('StateNode', () => {
  it('renders the board, state, depth, status and accessible label', () => {
    render(
      <ReactFlowProvider>
        <StateNode {...stateNodeProps()} />
      </ReactFlowProvider>,
    )
    expect(screen.getByText('724596831')).toBeInTheDocument()
    expect(screen.getByText('d3')).toBeInTheDocument()
    expect(screen.getByText('Visited')).toBeInTheDocument()
    expect(
      screen.getByText('Node 5, state 724596831, depth 3, visited'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Expand 12 hidden nodes' })).toBeInTheDocument()
    expect(document.querySelector('[data-current]')).not.toBeNull()
    expect(document.querySelector('[data-collapsed]')).not.toBeNull()
    expect(document.querySelector('[data-solution]')).not.toBeNull()
  })
})

describe('CollapsedBadge', () => {
  it('shows the hidden breakdown in its tooltip', () => {
    render(
      <CollapsedBadge
        id={5}
        hidden={nodeData.hidden!}
        onExpandOne={vi.fn()}
        onExpandSubtree={vi.fn()}
      />,
    )
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      '+12 hidden · 9 visited · 3 duplicate',
    )
  })

  it('expands one level on click after the double-click window', () => {
    vi.useFakeTimers()
    const onExpandOne = vi.fn()
    const onExpandSubtree = vi.fn()
    render(
      <CollapsedBadge
        id={5}
        hidden={nodeData.hidden!}
        onExpandOne={onExpandOne}
        onExpandSubtree={onExpandSubtree}
      />,
    )
    fireEvent.click(screen.getByRole('button'))
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(onExpandOne).toHaveBeenCalledWith(5)
    expect(onExpandSubtree).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('expands the whole subtree on double click', () => {
    vi.useFakeTimers()
    const onExpandOne = vi.fn()
    const onExpandSubtree = vi.fn()
    render(
      <CollapsedBadge
        id={5}
        hidden={nodeData.hidden!}
        onExpandOne={onExpandOne}
        onExpandSubtree={onExpandSubtree}
      />,
    )
    const button = screen.getByRole('button')
    fireEvent.click(button)
    fireEvent.doubleClick(button)
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(onExpandSubtree).toHaveBeenCalledWith(5)
    expect(onExpandOne).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('expands one level with the keyboard', () => {
    const onExpandOne = vi.fn()
    render(
      <CollapsedBadge
        id={5}
        hidden={nodeData.hidden!}
        onExpandOne={onExpandOne}
        onExpandSubtree={vi.fn()}
      />,
    )
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' })
    expect(onExpandOne).toHaveBeenCalledWith(5)
  })
})

describe('TreeToolbar', () => {
  it('reports counts and exposes the auto-collapse state', () => {
    const onToggleAutoCollapse = vi.fn()
    const onExpandAll = vi.fn()
    const onCollapseFinished = vi.fn()
    const onFitView = vi.fn()
    render(
      <TreeToolbar
        visibleCount={108}
        totalCount={3001}
        collapsedCount={6}
        autoCollapse
        onExpandAll={onExpandAll}
        onCollapseFinished={onCollapseFinished}
        onToggleAutoCollapse={onToggleAutoCollapse}
        onFitView={onFitView}
      />,
    )
    expect(screen.getByTestId('tree-count')).toHaveTextContent(
      '108 of 3,001 nodes visible · 6 collapsed',
    )

    const toggle = screen.getByRole('button', { name: /Auto-collapse/ })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(toggle)
    expect(onToggleAutoCollapse).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /Expand all/ }))
    expect(onExpandAll).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: /Collapse finished/ }))
    expect(onCollapseFinished).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Fit the tree to the viewport' }))
    expect(onFitView).toHaveBeenCalledTimes(1)
  })
})

describe('TreeCanvas', () => {
  it('renders the large fixture with a toolbar and visible nodes', async () => {
    render(<TreeCanvas snapshot={large} followCamera={false} reducedMotion />)

    expect(screen.getByRole('toolbar', { name: 'Tree view controls' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Expand all/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Collapse finished/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Auto-collapse/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fit the tree to the viewport' })).toBeInTheDocument()
    expect(screen.getByText(/nodes visible/)).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelectorAll('.react-flow__node').length).toBeGreaterThan(0)
    })
    expect(document.querySelector('.react-flow__node[data-id="0"]')).not.toBeNull()
  })
})
