import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import IconButton from '../IconButton'

describe('IconButton', () => {
  it('exposes an accessible name and a hotkey tooltip', () => {
    render(<IconButton label="Step forward" icon={<span />} hotkey="Space" />)

    const button = screen.getByRole('button', { name: 'Step forward' })
    expect(button).toHaveAttribute('title', 'Step forward (Space)')
    expect(button).toHaveAttribute('aria-keyshortcuts', 'Space')
  })

  it('reflects toggle state with aria-pressed', () => {
    render(<IconButton label="Auto-play" icon={<span />} active />)
    expect(screen.getByRole('button', { name: 'Auto-play' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('explains why it is disabled and blocks clicks', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<IconButton label="Step forward" icon={<span />} disabled onClick={onClick} />)

    const button = screen.getByRole('button', { name: 'Step forward' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('title', 'Step forward — unavailable right now')
    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })
})
