import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { Slider } from './Slider'

describe('Slider', () => {
  it('renders a slider role with min/max/value', () => {
    render(<Slider aria-label="Vol" defaultValue={40} min={0} max={100} />)
    const slider = screen.getByRole('slider', { name: 'Vol' })
    expect(slider).toHaveAttribute('min', '0')
    expect(slider).toHaveAttribute('max', '100')
    expect(slider).toHaveValue('40')
  })

  it('updates and fires onChange (uncontrolled)', () => {
    const onChange = vi.fn()
    render(<Slider aria-label="Vol" defaultValue={40} step={5} onChange={onChange} />)
    fireEvent.change(screen.getByRole('slider'), { target: { value: '45' } })
    expect(onChange).toHaveBeenCalledWith(45, expect.anything())
    expect(screen.getByRole('slider')).toHaveValue('45')
  })

  it('respects a controlled value and clamps to range', () => {
    render(<Slider aria-label="Vol" value={150} min={0} max={100} />)
    expect(screen.getByRole('slider')).toHaveValue('100')
  })

  it('applies the Expressive size', () => {
    const { container } = render(<Slider aria-label="Vol" size="l" />)
    expect(container.firstChild).toHaveAttribute('data-size', 'l')
  })

  it('renders a range slider with two thumbs and clamps ordering', () => {
    const onChange = vi.fn()
    render(<Slider aria-label="Price" value={[20, 60]} onChange={onChange} />)
    expect(screen.getByRole('group', { name: 'Price' })).toBeInTheDocument()
    const [minInput, maxInput] = screen.getAllByRole('slider')
    expect(minInput).toHaveValue('20')
    expect(maxInput).toHaveValue('60')
    // Moving the min thumb past the max is clamped to the max.
    fireEvent.change(minInput, { target: { value: '80' } })
    expect(onChange).toHaveBeenCalledWith([60, 60], expect.anything())
  })

  it('supports vertical orientation and centered mode', () => {
    const { container } = render(
      <Slider aria-label="V" orientation="vertical" centered defaultValue={70} />,
    )
    expect(container.firstChild).toHaveAttribute('data-orientation', 'vertical')
  })

  it('is disabled when disabled', () => {
    render(<Slider aria-label="Vol" defaultValue={40} disabled />)
    expect(screen.getByRole('slider')).toBeDisabled()
  })

  it('forwards a ref to the root', () => {
    const ref = createRef<HTMLSpanElement>()
    render(<Slider ref={ref} aria-label="Vol" />)
    expect(ref.current).toBeInstanceOf(HTMLSpanElement)
  })

  it('has no axe violations (single and range)', async () => {
    const { container } = render(
      <div>
        <Slider aria-label="Volume" defaultValue={50} />
        <Slider aria-label="Range" value={[10, 40]} />
      </div>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
