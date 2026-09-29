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
    expect(onChange).toHaveBeenCalledWith(expect.anything(), 45)
    expect(screen.getByRole('slider')).toHaveValue('45')
  })

  it('respects a controlled value and clamps to range', () => {
    render(<Slider aria-label="Vol" value={150} min={0} max={100} />)
    expect(screen.getByRole('slider')).toHaveValue('100')
  })

  it('applies the Expressive size', () => {
    const { container } = render(<Slider aria-label="Vol" size="lg" />)
    expect(container.firstChild).toHaveAttribute('data-size', 'lg')
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
    expect(onChange).toHaveBeenCalledWith(expect.anything(), [60, 60])
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

  it('forwards inputRef to the native range input', () => {
    const inputRef = createRef<HTMLInputElement>()
    render(<Slider inputRef={inputRef} aria-label="Vol" />)
    expect(inputRef.current).toBe(screen.getByRole('slider'))
  })

  it('forwards inputRef to the start input of a range slider', () => {
    const inputRef = createRef<HTMLInputElement>()
    render(<Slider inputRef={inputRef} aria-label="Range" defaultValue={[10, 40]} />)
    expect(inputRef.current).toBe(screen.getByRole('slider', { name: 'Minimum' }))
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

  it('has no axe violations (vertical, formatted, localized range, disabled)', async () => {
    const { container } = render(
      <div>
        <Slider aria-label="Vertical" orientation="vertical" defaultValue={30} />
        <Slider aria-label="Percent" defaultValue={40} valueLabelFormat={(v) => `${v}%`} />
        <Slider aria-label="範囲" value={[10, 40]} rangeStartLabel="最小" rangeEndLabel="最大" />
        <Slider aria-label="Off" defaultValue={20} disabled />
      </div>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('Slider ARIA (SL3/SL6/SL7)', () => {
  it('sets aria-orientation="vertical" only on vertical sliders', () => {
    const { rerender } = render(<Slider aria-label="V" orientation="vertical" />)
    expect(screen.getByRole('slider')).toHaveAttribute('aria-orientation', 'vertical')
    rerender(<Slider aria-label="V" orientation="horizontal" />)
    expect(screen.getByRole('slider')).not.toHaveAttribute('aria-orientation')
  })

  it('sets aria-orientation on both range inputs when vertical', () => {
    render(<Slider aria-label="R" orientation="vertical" value={[10, 40]} />)
    for (const input of screen.getAllByRole('slider')) {
      expect(input).toHaveAttribute('aria-orientation', 'vertical')
    }
  })

  it('announces the formatted value via aria-valuetext', () => {
    render(
      <Slider aria-label="Vol" defaultValue={40} valueLabelFormat={(v) => `${v}%`} />,
    )
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '40%')
  })

  it('updates aria-valuetext as the value changes', () => {
    render(
      <Slider aria-label="Vol" defaultValue={40} valueLabelFormat={(v) => `${v}%`} />,
    )
    fireEvent.change(screen.getByRole('slider'), { target: { value: '55' } })
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '55%')
  })

  it('omits aria-valuetext without a format (and for non-primitive output)', () => {
    const { rerender } = render(<Slider aria-label="Vol" defaultValue={40} />)
    expect(screen.getByRole('slider')).not.toHaveAttribute('aria-valuetext')
    rerender(
      <Slider aria-label="Vol" defaultValue={40} valueLabelFormat={(v) => <b>{v}</b>} />,
    )
    expect(screen.getByRole('slider')).not.toHaveAttribute('aria-valuetext')
  })

  it('uses localizable range thumb labels with English defaults', () => {
    const { rerender } = render(<Slider aria-label="Price" value={[20, 60]} />)
    expect(screen.getByRole('slider', { name: 'Minimum' })).toHaveValue('20')
    expect(screen.getByRole('slider', { name: 'Maximum' })).toHaveValue('60')
    rerender(
      <Slider aria-label="価格" value={[20, 60]} rangeStartLabel="最小" rangeEndLabel="最大" />,
    )
    expect(screen.getByRole('slider', { name: '最小' })).toHaveValue('20')
    expect(screen.getByRole('slider', { name: '最大' })).toHaveValue('60')
  })
})

describe('Slider keyboard (SL4)', () => {
  // Arrow keys and thumb-drag value changes are delegated to the native
  // <input type="range"> UA implementation, which jsdom does not provide —
  // here we assert the delegation contract (attributes + no preventDefault);
  // PageUp/PageDown/Home/End are implemented in onKeyDown and fully covered.

  it('PageUp/PageDown move a continuous slider by 10% of the range', () => {
    const onChange = vi.fn()
    render(<Slider aria-label="Vol" defaultValue={40} onChange={onChange} />)
    const input = screen.getByRole('slider')
    input.focus()
    fireEvent.keyDown(input, { key: 'PageUp' })
    expect(onChange).toHaveBeenLastCalledWith(expect.anything(), 50)
    expect(input).toHaveValue('50')
    fireEvent.keyDown(input, { key: 'PageDown' })
    expect(onChange).toHaveBeenLastCalledWith(expect.anything(), 40)
    expect(input).toHaveValue('40')
  })

  it('pages a stepped slider by clamp(floor(intervals / 10), 1, 10) steps', () => {
    const page = (step: number, from: number, key: string) => {
      const { unmount } = render(
        <Slider aria-label="S" defaultValue={from} step={step} />,
      )
      const input = screen.getByRole('slider')
      fireEvent.keyDown(input, { key })
      const value = (input as HTMLInputElement).value
      unmount()
      return value
    }
    // 10 intervals -> 1 step of 10.
    expect(page(10, 50, 'PageUp')).toBe('60')
    // 20 intervals -> 2 steps of 5.
    expect(page(5, 50, 'PageUp')).toBe('60')
    // 3 intervals -> still 1 step (minimum page).
    expect(page(30, 30, 'PageDown')).toBe('0')
  })

  it('caps the page jump at 10 steps for fine-grained sliders', () => {
    render(<Slider aria-label="F" min={0} max={1000} defaultValue={500} />)
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'PageUp' })
    expect(screen.getByRole('slider')).toHaveValue('510')
  })

  it('clamps page jumps at the range bounds without firing at rest', () => {
    const onChange = vi.fn()
    render(<Slider aria-label="Vol" defaultValue={95} onChange={onChange} />)
    const input = screen.getByRole('slider')
    fireEvent.keyDown(input, { key: 'PageUp' })
    expect(input).toHaveValue('100')
    onChange.mockClear()
    fireEvent.keyDown(input, { key: 'PageUp' })
    expect(input).toHaveValue('100')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('supports Home and End', () => {
    const onChange = vi.fn()
    render(<Slider aria-label="Vol" defaultValue={40} min={10} max={90} onChange={onChange} />)
    const input = screen.getByRole('slider')
    fireEvent.keyDown(input, { key: 'End' })
    expect(onChange).toHaveBeenLastCalledWith(expect.anything(), 90)
    expect(input).toHaveValue('90')
    fireEvent.keyDown(input, { key: 'Home' })
    expect(onChange).toHaveBeenLastCalledWith(expect.anything(), 10)
    expect(input).toHaveValue('10')
  })

  it('pages vertical sliders identically', () => {
    render(<Slider aria-label="V" orientation="vertical" defaultValue={40} />)
    const input = screen.getByRole('slider')
    fireEvent.keyDown(input, { key: 'PageUp' })
    expect(input).toHaveValue('50')
    fireEvent.keyDown(input, { key: 'PageDown' })
    expect(input).toHaveValue('40')
  })

  it('operates range thumbs independently and clamps at the crossover', () => {
    const onChange = vi.fn()
    render(<Slider aria-label="Price" defaultValue={[60, 65]} onChange={onChange} />)
    const [start, end] = screen.getAllByRole('slider')
    // Start thumb paging past the end thumb clamps to it.
    fireEvent.keyDown(start, { key: 'PageUp' })
    expect(onChange).toHaveBeenLastCalledWith(expect.anything(), [65, 65])
    // End thumb pages within its own bound.
    fireEvent.keyDown(end, { key: 'PageUp' })
    expect(onChange).toHaveBeenLastCalledWith(expect.anything(), [65, 75])
    fireEvent.keyDown(end, { key: 'End' })
    expect(onChange).toHaveBeenLastCalledWith(expect.anything(), [65, 100])
  })

  it('leaves arrow keys to the native range input', () => {
    render(<Slider aria-label="Vol" defaultValue={40} step={5} />)
    const input = screen.getByRole('slider')
    // The delegation contract: a real range input carrying min/max/step.
    expect(input).toHaveAttribute('type', 'range')
    expect(input).toHaveAttribute('step', '5')
    // Our onKeyDown must not preventDefault arrow keys (fireEvent returns
    // false when the event was default-prevented).
    expect(fireEvent.keyDown(input, { key: 'ArrowRight' })).toBe(true)
    expect(fireEvent.keyDown(input, { key: 'ArrowUp' })).toBe(true)
  })
})

/** jsdom drops props passed to fireEvent.pointer*; construct events manually. */
function firePointer(el: Element | Window, type: string, props: Record<string, unknown>) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(event, props)
  fireEvent(el, event)
}

describe('Slider press/drag squeeze (SL1/SL2)', () => {
  const getThumb = (container: HTMLElement, index = 0) =>
    container.querySelector(`span[aria-hidden][data-index='${index}']`)

  it('squeezes the handle while pressed and releases on pointerup', () => {
    const { container } = render(<Slider aria-label="Vol" defaultValue={40} />)
    const input = screen.getByRole('slider')
    const thumb = getThumb(container)
    expect(thumb).not.toHaveAttribute('data-pressed')
    firePointer(input, 'pointerdown', { pointerId: 1 })
    expect(thumb).toHaveAttribute('data-pressed')
    firePointer(window, 'pointerup', { pointerId: 1 })
    expect(thumb).not.toHaveAttribute('data-pressed')
  })

  it('keeps the squeeze through a drag (change events while pressed)', () => {
    const { container } = render(<Slider aria-label="Vol" defaultValue={40} />)
    const input = screen.getByRole('slider')
    firePointer(input, 'pointerdown', { pointerId: 1 })
    fireEvent.change(input, { target: { value: '60' } })
    expect(getThumb(container)).toHaveAttribute('data-pressed')
    expect(input).toHaveValue('60')
    firePointer(window, 'pointercancel', { pointerId: 1 })
    expect(getThumb(container)).not.toHaveAttribute('data-pressed')
  })

  it('squeezes only the pressed thumb of a range slider', () => {
    const { container } = render(<Slider aria-label="Price" defaultValue={[20, 60]} />)
    const [, end] = screen.getAllByRole('slider')
    firePointer(end, 'pointerdown', { pointerId: 1 })
    expect(getThumb(container, 1)).toHaveAttribute('data-pressed')
    expect(getThumb(container, 0)).not.toHaveAttribute('data-pressed')
    firePointer(window, 'pointerup', { pointerId: 1 })
    expect(getThumb(container, 1)).not.toHaveAttribute('data-pressed')
  })

  it('does not press-squeeze when disabled', () => {
    const { container } = render(<Slider aria-label="Vol" defaultValue={40} disabled />)
    firePointer(screen.getByRole('slider'), 'pointerdown', { pointerId: 1 })
    expect(getThumb(container)).not.toHaveAttribute('data-pressed')
  })

  it('pairs each thumb with its input and hosts a focus ring', () => {
    const { container } = render(<Slider aria-label="Price" defaultValue={[20, 60]} />)
    const inputs = screen.getAllByRole('slider')
    inputs.forEach((input, i) => {
      expect(input).toHaveAttribute('data-index', String(i))
      const thumb = getThumb(container, i)
      expect(thumb).toBeInTheDocument()
      // Focus ring element rendered inside the thumb (visibility is CSS
      // :has(:focus-visible)-driven, which jsdom cannot evaluate).
      expect(thumb!.querySelector('span')).toBeInTheDocument()
    })
  })
})
