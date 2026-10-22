import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./components/layout/AppHeader', () => ({ default: () => <header /> }))
vi.mock('./routes/HomePage', () => ({
  default: () => (
    <main id="main-content" tabIndex={-1}>
      Home page
    </main>
  ),
}))
vi.mock('./routes/LearnPage', () => ({
  default: () => (
    <main id="main-content" tabIndex={-1}>
      Learn page
    </main>
  ),
}))
vi.mock('./routes/VisualizerPage', () => ({
  default: () => (
    <main id="main-content" tabIndex={-1}>
      Visualizer page
    </main>
  ),
}))

beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('renders a skip link to the main landmark', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main-content',
    )
    expect(document.querySelector('main#main-content')).toBeInTheDocument()
  })

  it('moves focus to the new main landmark after client-side navigation', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
        <Link to="/learn">Go to learn</Link>
      </MemoryRouter>,
    )

    expect(screen.getByRole('main')).not.toHaveFocus()
    await user.click(screen.getByRole('link', { name: 'Go to learn' }))
    expect(screen.getByRole('main')).toHaveFocus()
  })
})
