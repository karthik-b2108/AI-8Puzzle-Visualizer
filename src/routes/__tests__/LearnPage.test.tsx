import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HashRouter, MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import LearnPage from '../LearnPage'
import { LEARN_SECTIONS } from '../../components/learn/sections'

interface ScrollCall {
  target: unknown
  options: boolean | ScrollIntoViewOptions | undefined
}

let scrollCalls: ScrollCall[] = []

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/learn']}>
      <LearnPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  scrollCalls = []
  HTMLElement.prototype.scrollIntoView = function scrollIntoView(options) {
    scrollCalls.push({ target: this, options })
  }
})

afterEach(() => {
  cleanup()
  delete document.documentElement.dataset.theme
})

describe('LearnPage', () => {
  it('renders the seven numbered sections with their anchor ids', () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'How depth-first search solves the 8-puzzle',
    )
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(7)

    for (const section of LEARN_SECTIONS) {
      const element = document.getElementById(section.id)
      expect(element).not.toBeNull()
      expect(
        within(element as HTMLElement).getByRole('heading', {
          level: 2,
          name: section.title,
        }),
      ).toBeInTheDocument()
    }

    const toc = screen.getByRole('navigation', { name: 'Sections' })
    expect(within(toc).getAllByRole('listitem')).toHaveLength(7)
  })

  it('scrolls to a section without changing the hash route', async () => {
    const user = userEvent.setup()
    render(
      <HashRouter>
        <LearnPage />
      </HashRouter>,
    )

    const hashBefore = window.location.hash
    const toc = screen.getByRole('navigation', { name: 'Sections' })

    await user.click(within(toc).getByRole('button', { name: 'Completeness' }))

    expect(scrollCalls).toHaveLength(1)
    expect(scrollCalls[0]?.target).toBe(document.getElementById('completeness'))
    expect(scrollCalls[0]?.options).toEqual({ behavior: 'smooth', block: 'start' })
    expect(window.location.hash).toBe(hashBefore)
  })

  it('collapses the contents menu with a keyboard-accessible toggle', () => {
    renderPage()

    // The toggle is hidden above 900px, so query it by its controller rather
    // than depending on the jsdom viewport width.
    const toggle = document.querySelector<HTMLButtonElement>(
      'button[aria-controls="learn-toc-list"]',
    )
    expect(toggle).not.toBeNull()
    if (!toggle) return

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-label', 'On this page')

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps the pseudocode in step with the engine', () => {
    renderPage()

    const code = screen.getByRole('region', { name: /pseudocode, scrollable/i })
    expect(code.textContent).toContain('node = stack.pop()')
    expect(code.textContent).toContain('stack.push(child)')
    expect(code.textContent).toContain('visited.add(node.state)')
    expect(code.textContent).toContain('node.parent.state')
  })

  it('exposes the complexity numbers and symbols in the table', () => {
    renderPage()

    const table = screen.getByRole('table', { name: /worst-case time and space/i })
    expect(table.textContent).toContain('O(b^m)')
    expect(table.textContent).toContain('O(b·m)')
    expect(table.textContent).toContain('181,440')
    expect(table.closest('figure')?.textContent).toContain('9!/2')
  })

  it('gives every diagram snapshot an accessible name', () => {
    renderPage()

    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(4)
    expect(images[0]).toHaveAccessibleName(/push the root/i)
    expect(images[1]).toHaveAccessibleName(/pop the top node/i)
    expect(images[2]).toHaveAccessibleName(/push the children/i)
    expect(images[3]).toHaveAccessibleName(/backtrack to the next sibling/i)

    for (const image of images) {
      expect(image.querySelector('title')?.textContent).toBeTruthy()
      expect(image.querySelector('desc')?.textContent).toBeTruthy()
    }
  })

  it.each(['light', 'dark'] as const)('renders in the %s theme', (theme) => {
    document.documentElement.dataset.theme = theme
    renderPage()

    expect(document.documentElement.dataset.theme).toBe(theme)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(7)
  })
})
