import { createRef } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { ScrollField } from './ScrollField'

function firePointer(el: Element, type: string, props: Record<string, unknown>) {
  const { timeStamp, ...rest } = props
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(event, { pointerId: 1, pointerType: 'touch', button: 0, ...rest })
  if (timeStamp !== undefined) Object.defineProperty(event, 'timeStamp', { value: timeStamp })
  fireEvent(el, event)
}

/** The field laid out as a 100×200 box at the origin (centre y = 100). */
function layout(el: HTMLElement) {
  el.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 100, bottom: 200, width: 100, height: 200, x: 0, y: 0 }) as DOMRect
  return el
}

const ITEM = 200 / 3

describe('ScrollField', () => {
  it('is a spinbutton with value, range and value text', () => {
    render(
      <ScrollField
        aria-label="Hour"
        min={1}
        max={12}
        defaultValue={7}
        getValueText={(v) => `${v} o'clock`}
      />,
    )
    const field = screen.getByRole('spinbutton', { name: 'Hour' })
    expect(field).toHaveAttribute('aria-valuenow', '7')
    expect(field).toHaveAttribute('aria-valuemin', '1')
    expect(field).toHaveAttribute('aria-valuemax', '12')
    expect(field).toHaveAttribute('aria-valuetext', "7 o'clock")
    expect(field).toHaveAttribute('tabindex', '0')
  })

  it('draws the value centred, zero-padded, with wrapping neighbours', () => {
    const { container } = render(<ScrollField aria-label="M" max={59} defaultValue={0} />)
    const selected = container.querySelector('[data-selected]')
    expect(selected).toHaveTextContent('00')
    const texts = [...container.querySelectorAll('span[style]')].map((n) => n.textContent)
    expect(texts).toEqual(['57', '58', '59', '00', '01', '02', '03'])
  })

  it('steps with the keyboard (APG spinbutton) and wraps', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ScrollField aria-label="M" max={59} defaultValue={58} onChange={onChange} />)
    const field = screen.getByRole('spinbutton')
    field.focus()
    await user.keyboard('{ArrowUp}')
    expect(field).toHaveAttribute('aria-valuenow', '59')
    await user.keyboard('{ArrowUp}')
    expect(field).toHaveAttribute('aria-valuenow', '0')
    await user.keyboard('{ArrowDown}')
    expect(field).toHaveAttribute('aria-valuenow', '59')
    await user.keyboard('{PageDown}')
    expect(field).toHaveAttribute('aria-valuenow', '54')
    await user.keyboard('{PageUp}')
    expect(field).toHaveAttribute('aria-valuenow', '59')
    await user.keyboard('{Home}')
    expect(field).toHaveAttribute('aria-valuenow', '0')
    await user.keyboard('{End}')
    expect(field).toHaveAttribute('aria-valuenow', '59')
    expect(onChange.mock.calls.map(([, v]) => v)).toEqual([59, 0, 59, 54, 59, 0, 59])
    expect(onChange.mock.calls[0][0]).toBeInstanceOf(Event)
  })

  it('moves one value per mouse-wheel notch and accumulates trackpad deltas', () => {
    const onChange = vi.fn()
    render(<ScrollField aria-label="M" max={59} defaultValue={10} onChange={onChange} />)
    const field = screen.getByRole('spinbutton')
    const notch = new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true })
    act(() => {
      field.dispatchEvent(notch)
    })
    expect(notch.defaultPrevented).toBe(true)
    expect(field).toHaveAttribute('aria-valuenow', '11')
    fireEvent.wheel(field, { deltaY: -3, deltaMode: 1 })
    expect(field).toHaveAttribute('aria-valuenow', '10')
    for (let i = 0; i < 5; i++) fireEvent.wheel(field, { deltaY: 10 })
    expect(field).toHaveAttribute('aria-valuenow', '11')
    expect(onChange).toHaveBeenCalledTimes(3)
  })

  it('scrolls with a drag and snaps to the nearest value', () => {
    const onChange = vi.fn()
    render(<ScrollField aria-label="M" max={59} defaultValue={10} onChange={onChange} />)
    const field = layout(screen.getByRole('spinbutton'))
    firePointer(field, 'pointerdown', { clientY: 150, timeStamp: 1 })
    // Two items up (plus a little): the values below move into the centre.
    firePointer(field, 'pointermove', { clientY: 150 - ITEM, timeStamp: 100 })
    expect(field).toHaveAttribute('aria-valuenow', '11')
    firePointer(field, 'pointermove', { clientY: 150 - 2 * ITEM - 10, timeStamp: 1000 })
    firePointer(field, 'pointerup', { clientY: 150 - 2 * ITEM - 10, timeStamp: 1200 })
    expect(field).toHaveAttribute('aria-valuenow', '12')
    expect(onChange.mock.calls.map(([, v]) => v)).toEqual([11, 12])
  })

  it('flings at most one value past the nearest (PagerSnapDistance.atMost(1))', () => {
    render(<ScrollField aria-label="M" max={59} defaultValue={10} />)
    const field = layout(screen.getByRole('spinbutton'))
    firePointer(field, 'pointerdown', { clientY: 150, timeStamp: 1 })
    firePointer(field, 'pointermove', { clientY: 150 - ITEM * 0.6, timeStamp: 10 })
    firePointer(field, 'pointerup', { clientY: 150 - ITEM * 0.6, timeStamp: 20 })
    expect(field).toHaveAttribute('aria-valuenow', '12')
  })

  it('scrolls to a tapped neighbour', () => {
    render(<ScrollField aria-label="M" max={59} defaultValue={10} />)
    const field = layout(screen.getByRole('spinbutton'))
    firePointer(field, 'pointerdown', { clientY: 100 + ITEM })
    firePointer(field, 'pointerup', { clientY: 100 + ITEM })
    expect(field).toHaveAttribute('aria-valuenow', '11')
    firePointer(field, 'pointerdown', { clientY: 100 - ITEM })
    firePointer(field, 'pointerup', { clientY: 100 - ITEM })
    expect(field).toHaveAttribute('aria-valuenow', '10')
  })

  it('follows a controlled value and stays put when a change is rejected', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(
      <ScrollField aria-label="M" max={59} value={20} onChange={onChange} />,
    )
    const field = screen.getByRole('spinbutton')
    field.focus()
    await user.keyboard('{ArrowUp}')
    expect(onChange).toHaveBeenLastCalledWith(expect.any(Event), 21)
    expect(field).toHaveAttribute('aria-valuenow', '20')
    rerender(<ScrollField aria-label="M" max={59} value={45} onChange={onChange} />)
    expect(field).toHaveAttribute('aria-valuenow', '45')
    expect(field.querySelector('[data-selected]')).toHaveTextContent('45')
  })

  it('ignores input while disabled and leaves the Tab order', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ScrollField aria-label="M" max={59} defaultValue={5} disabled onChange={onChange} />)
    const field = screen.getByRole('spinbutton')
    expect(field).toHaveAttribute('aria-disabled', 'true')
    expect(field).toHaveAttribute('tabindex', '-1')
    field.focus()
    await user.keyboard('{ArrowUp}')
    fireEvent.wheel(field, { deltaY: 100 })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('uses formatValue for the items and as the default value text', () => {
    render(<ScrollField aria-label="Year" min={2000} max={2030} defaultValue={2026} formatValue={String} />)
    expect(screen.getByRole('spinbutton')).toHaveAttribute('aria-valuetext', '2026')
  })

  it('forwards the ref to the root', () => {
    const ref = createRef<HTMLDivElement>()
    render(<ScrollField ref={ref} aria-label="M" max={59} />)
    expect(ref.current).toBe(screen.getByRole('spinbutton'))
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <div>
        <ScrollField aria-label="Minute" max={59} defaultValue={30} />
        <ScrollField aria-label="Disabled" max={59} disabled />
      </div>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
