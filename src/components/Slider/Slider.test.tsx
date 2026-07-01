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
    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '45' } })
    expect(onChange).toHaveBeenCalledWith(45, expect.anything())
    expect(slider).toHaveValue('45')
  })

  it('respects a controlled value', () => {
    const onChange = vi.fn()
    render(<Slider aria-label="Vol" value={20} onChange={onChange} />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveValue('20')
    fireEvent.change(slider, { target: { value: '35' } })
    // controlled: value stays until the parent updates it
    expect(onChange).toHaveBeenCalledWith(35, expect.anything())
    expect(slider).toHaveValue('20')
  })

  it('is disabled when disabled', () => {
    render(<Slider aria-label="Vol" defaultValue={40} disabled />)
    expect(screen.getByRole('slider')).toBeDisabled()
  })

  it('clamps the displayed value to the range', () => {
    render(<Slider aria-label="Vol" value={150} min={0} max={100} />)
    expect(screen.getByRole('slider')).toHaveValue('100')
  })

  it('forwards a ref to the input', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Slider ref={ref} aria-label="Vol" />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(<Slider aria-label="Volume" defaultValue={50} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
