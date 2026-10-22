import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReactFlowProvider, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { SearchNode, SearchSnapshot } from '../../../contract/types'
import largeFixture from '../../../contract/fixtures/large-3000.json'
import type { StateNodeData } from '../../../hooks/useTreeLayout'
import { useTreeViewStore } from '../../../store/useTreeViewStore'
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
    const width = isFlow ? 1200 : 66
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
    return this.classList.contains('react-flow') ? rect(1200, 800) : rect(66, 66)
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
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
  isCurrent: true,
  isHovered: false,
  isSelected: false,
  isOnSolutionPath: true,
  depth: 3,
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
    width: 66,
    height: 66,
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    dragHandle: undefined,
    parentId: undefined,
  } as unknown as NodeProps<StateNodeType>
}

describe('StateNode', () => {
  it('renders only the board with a category status bar', () => {
    render(
      <ReactFlowProvider>
        <StateNode {...stateNodeProps()} />
      </ReactFlowProvider>,
    )
    expect(screen.getByText('Node 5, depth 3, visited')).toBeInTheDocument()
    expect(screen.queryByText('724596831')).not.toBeInTheDocument()
    expect(screen.queryByText('d3')).not.toBeInTheDocument()
    expect(screen.queryByText('Visited')).not.toBeInTheDocument()
    expect(document.querySelector('[data-status="visited"]')).not.toBeNull()
    expect(document.querySelector('[data-current]')).not.toBeNull()
    expect(document.querySelector('[data-solution]')).not.toBeNull()
  })
})

describe('TreeToolbar', () => {
  it('reports the node count and fits the tree', () => {
    const onFitView = vi.fn()
    render(<TreeToolbar nodeCount={108} onFitView={onFitView} />)
    expect(screen.getByTestId('tree-count')).toHaveTextContent('108 nodes')

    fireEvent.click(screen.getByRole('button', { name: 'Fit the tree to the viewport' }))
    expect(onFitView).toHaveBeenCalledTimes(1)
  })
})

describe('TreeCanvas', () => {
  it('renders the large fixture with every node available', async () => {
    render(<TreeCanvas snapshot={large} reducedMotion />)

    expect(screen.getByRole('toolbar', { name: 'Tree view controls' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fit the tree to the viewport' })).toBeInTheDocument()
    expect(screen.getByText(/nodes/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Expand all/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Collapse/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Auto-collapse/ })).not.toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelectorAll('.react-flow__node').length).toBeGreaterThan(0)
    })
    expect(document.querySelector('.react-flow__node[data-id="0"]')).not.toBeNull()
  })
})
