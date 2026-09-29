import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { SegmentedButton } from './SegmentedButton'

const options = [
  { value: 'd', label: 'Day' },
  { value: 'w', label: 'Week' },
  { value: 'm', label: 'Month' },
]

describe('SegmentedButton', () => {
  it('renders a group of toggle buttons with aria-pressed', () => {
    render(<SegmentedButton options={options} value="w" onChange={() => {}} />)
    expect(screen.getByRole('group')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Week', pressed: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Day', pressed: false })).toBeInTheDocument()
  })

  it('selects a segment on click (single-select)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SegmentedButton options={options} value="w" onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Month' }))
    expect(onChange).toHaveBeenCalledWith(expect.any(Object), 'm')
  })

  it('toggles membership (multi-select)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SegmentedButton
        multiSelect
        options={options}
        value={['w']}
        onChange={onChange}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Day' }))
    expect(onChange).toHaveBeenCalledWith(expect.any(Object), ['w', 'd'])
    await user.click(screen.getByRole('button', { name: 'Week' }))
    expect(onChange).toHaveBeenLastCalledWith(expect.any(Object), [])
  })

  it('does not fire when disabled', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const onChange = vi.fn()
    render(<SegmentedButton disabled options={options} value="w" onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Day' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(<SegmentedButton ref={ref} options={options} value="w" onChange={() => {}} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <SegmentedButton
        aria-label="View"
        options={options}
        value="w"
        onChange={() => {}}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('SegmentedButton uncontrolled mode', () => {
  it('single-select updates from defaultValue', async () => {
    const user = userEvent.setup()
    render(
      <SegmentedButton
        aria-label="View"
        defaultValue="day"
        options={[
          { value: 'day', label: 'Day' },
          { value: 'week', label: 'Week' },
        ]}
      />,
    )
    expect(screen.getByRole('button', { name: 'Day' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Week' }))
    expect(screen.getByRole('button', { name: 'Week' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Day' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('multi-select accumulates from an empty default', async () => {
    const user = userEvent.setup()
    render(
      <SegmentedButton
        aria-label="Toppings"
        multiSelect
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'A' }))
    await user.click(screen.getByRole('button', { name: 'B' }))
    expect(screen.getByRole('button', { name: 'A' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'B' })).toHaveAttribute('aria-pressed', 'true')
  })
})
