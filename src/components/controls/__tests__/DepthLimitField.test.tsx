import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DepthLimitField from '../DepthLimitField'
import SpeedSlider from '../SpeedSlider'

describe('DepthLimitField', () => {
  it('commits only complete input on blur', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DepthLimitField value={6} onChange={onChange} />)

    const input = screen.getByLabelText('Depth limit')
    await user.clear(input)
    await user.type(input, '18')
    expect(onChange).not.toHaveBeenCalled()

    await user.tab()
    expect(onChange).toHaveBeenCalledWith(18)
  })

  it('ignores non-numeric input and restores the current value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DepthLimitField value={6} onChange={onChange} />)

    const input = screen.getByLabelText('Depth limit')
    await user.clear(input)
    await user.type(input, 'abc')
    expect(input).toHaveValue('')

    await user.tab()
    expect(onChange).not.toHaveBeenCalled()
    expect(input).toHaveValue('6')
  })

  it('warns above the threshold and stays silent at it', () => {
    const { rerender } = render(<DepthLimitField value={12} onChange={() => {}} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    rerender(<DepthLimitField value={13} onChange={() => {}} />)
    expect(screen.getByRole('status')).toHaveTextContent(/very large trees/)
  })
})

describe('SpeedSlider', () => {
  it('reports range changes and preset clicks', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SpeedSlider speed={1} onChange={onChange} />)

    expect(screen.getByRole('status')).toHaveTextContent('1×')
    await user.click(screen.getByRole('button', { name: '5×' }))
    expect(onChange).toHaveBeenCalledWith(5)

    fireEvent.change(screen.getByRole('slider'), { target: { value: '2.5' } })
    expect(onChange).toHaveBeenLastCalledWith(2.5)
  })
})
