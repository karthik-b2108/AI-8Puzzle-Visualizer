import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Header from '../Header'

function setup(overrides: Partial<ComponentProps<typeof Header>> = {}) {
  const handlers = {
    onThemeChange: vi.fn(),
    onToggleSidebar: vi.fn(),
  }

  render(
    <MemoryRouter>
      <Header
        elapsedMs={1234}
        running
        theme="light"
        sidebarOpen
        {...handlers}
        {...overrides}
      />
    </MemoryRouter>,
  )

  return handlers
}

describe('Header', () => {
  it('renders the live timer, routes and brand', () => {
    setup()

    expect(screen.getByLabelText('Elapsed engine time')).toHaveTextContent('1.234 s')
    expect(screen.getByLabelText('Elapsed engine time')).toHaveAttribute('data-running', 'true')
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Visualizer' })).toHaveAttribute('href', '/visualizer')
    expect(screen.getByRole('link', { name: 'Learn' })).toHaveAttribute('href', '/learn')
    expect(screen.getByRole('link', { name: /DFS 8-Puzzle home/ })).toHaveAttribute('href', '/')
  })

  it('switches theme through the toggle', async () => {
    const user = userEvent.setup()
    const { onThemeChange } = setup()

    const toggle = screen.getByRole('button', { name: 'Switch to dark theme' })
    expect(toggle).toHaveAttribute('title', 'Switch to dark theme')
    await user.click(toggle)
    expect(onThemeChange).toHaveBeenCalledWith('dark')
  })

  it('shows the light-theme action when the current theme is dark', () => {
    setup({ theme: 'dark' })
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument()
  })

  it('toggles the search list and reflects its open state', async () => {
    const user = userEvent.setup()
    const { onToggleSidebar } = setup()

    const toggle = screen.getByRole('button', { name: 'Hide search list' })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await user.click(toggle)
    expect(onToggleSidebar).toHaveBeenCalledTimes(1)
  })

  it('hides the search-list toggle when requested', () => {
    setup({ showSidebarToggle: false })
    expect(screen.queryByRole('button', { name: /search list/i })).not.toBeInTheDocument()
  })
})
