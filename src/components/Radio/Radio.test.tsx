import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Radio } from './Radio'

describe('Radio', () => {
  it('renders a radio role element', () => {
    render(<Radio aria-label="Option" name="g" />)
    expect(screen.getByRole('radio')).toBeInTheDocument()
  })

  it('defaults to unchecked', () => {
    render(<Radio aria-label="Option" name="g" />)
    expect(screen.getByRole('radio')).not.toBeChecked()
  })

  it('reflects checked prop', () => {
    render(<Radio aria-label="Option" name="g" checked onChange={() => {}} />)
    expect(screen.getByRole('radio')).toBeChecked()
  })

  it('fires onChange on click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Radio aria-label="Option" name="g" onChange={onChange} />)

    await user.click(screen.getByRole('radio'))
    expect(onChange).toHaveBeenCalledWith(expect.any(Object))
  })

  it('does not fire onChange when disabled', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const onChange = vi.fn()
    render(<Radio aria-label="Option" name="g" disabled onChange={onChange} />)
    await user.click(screen.getByRole('radio'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('forwards a ref', () => {
    const ref = { current: null as HTMLInputElement | null }
    render(<Radio ref={ref} aria-label="Option" name="g" />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('works in a radio group', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <>
        <Radio aria-label="A" name="group" value="a" onChange={onChange} />
        <Radio aria-label="B" name="group" value="b" onChange={onChange} />
      </>,
    )
    const [a, b] = screen.getAllByRole('radio')

    await user.click(a)
    expect(onChange).toHaveBeenCalledTimes(1)

    await user.click(b)
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('has no axe violations (unchecked)', async () => {
    const { container } = render(<Radio aria-label="Option" name="g" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations (checked)', async () => {
    const { container } = render(
      <Radio aria-label="Option" name="g" checked onChange={() => {}} />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
