import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { describe, expect, it, vi } from 'vitest'
import { createRef } from 'react'
import { DragHandle } from './DragHandle'

// jsdom PointerEvents drop clientX; MouseEvent-typed pointer events carry it.
function pointer(el: HTMLElement, type: string, clientX: number) {
  fireEvent(el, new MouseEvent(type, { clientX, bubbles: true }))
}

const separator = () => screen.getByRole('separator')

describe('DragHandle', () => {
  it('renders an APG window splitter', () => {
    render(
      <DragHandle aria-label="List" aria-controls="list" min={100} max={400} defaultValue={200} />,
    )
    const el = separator()
    expect(el).toHaveAttribute('aria-orientation', 'vertical')
    expect(el).toHaveAttribute('aria-valuenow', '200')
    expect(el).toHaveAttribute('aria-valuemin', '100')
    expect(el).toHaveAttribute('aria-valuemax', '400')
    expect(el).toHaveAttribute('aria-controls', 'list')
    expect(el).toHaveAttribute('tabindex', '0')
    expect(el).toHaveAccessibleName('List')
  })

  it('forwards ref to the separator', () => {
    const ref = createRef<HTMLDivElement>()
    render(<DragHandle ref={ref} aria-label="List" />)
    expect(ref.current).toBe(separator())
  })

  it('moves with the arrow keys, Page Up / Down and Home / End', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DragHandle aria-label="List" min={0} max={100} defaultValue={50} onChange={onChange} />)
    separator().focus()
    await user.keyboard('{ArrowRight}')
    expect(separator()).toHaveAttribute('aria-valuenow', '51')
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(separator()).toHaveAttribute('aria-valuenow', '49')
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}')
    expect(separator()).toHaveAttribute('aria-valuenow', '59')
    await user.keyboard('{PageDown}')
    expect(separator()).toHaveAttribute('aria-valuenow', '49')
    await user.keyboard('{ArrowUp}')
    expect(separator()).toHaveAttribute('aria-valuenow', '50')
    await user.keyboard('{End}')
    expect(separator()).toHaveAttribute('aria-valuenow', '100')
    await user.keyboard('{ArrowRight}')
    expect(separator()).toHaveAttribute('aria-valuenow', '100')
    await user.keyboard('{Home}')
    expect(separator()).toHaveAttribute('aria-valuenow', '0')
    expect(onChange).toHaveBeenLastCalledWith(expect.anything(), 0)
    // The clamped End → ArrowRight press reported nothing.
    expect(onChange).toHaveBeenCalledTimes(8)
  })

  it('reverses the horizontal arrows for an end-side pane and in RTL', async () => {
    const user = userEvent.setup()
    render(
      <>
        <DragHandle aria-label="End pane" paneSide="end" defaultValue={50} />
        <div dir="rtl" style={{ direction: 'rtl' }}>
          <DragHandle aria-label="RTL pane" defaultValue={50} />
        </div>
      </>,
    )
    const end = screen.getByRole('separator', { name: 'End pane' })
    const rtl = screen.getByRole('separator', { name: 'RTL pane' })
    end.focus()
    await user.keyboard('{ArrowRight}')
    expect(end).toHaveAttribute('aria-valuenow', '49')
    rtl.focus()
    await user.keyboard('{ArrowLeft}')
    expect(rtl).toHaveAttribute('aria-valuenow', '51')
  })

  it('resizes by pointer drag with pressed → dragged states and drag callbacks', () => {
    const onChange = vi.fn()
    const onDragStart = vi.fn()
    const onDragEnd = vi.fn()
    render(
      <DragHandle
        aria-label="List"
        min={100}
        max={300}
        defaultValue={200}
        onChange={onChange}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />,
    )
    const el = separator()
    pointer(el, 'pointerdown', 500)
    expect(el).toHaveAttribute('data-state', 'pressed')
    expect(onDragStart).not.toHaveBeenCalled()
    pointer(el, 'pointermove', 530)
    expect(el).toHaveAttribute('data-state', 'dragged')
    expect(onDragStart).toHaveBeenCalledWith(expect.anything(), 200)
    expect(el).toHaveAttribute('aria-valuenow', '230')
    pointer(el, 'pointermove', 700)
    expect(el).toHaveAttribute('aria-valuenow', '300')
    pointer(el, 'pointermove', 400)
    expect(el).toHaveAttribute('aria-valuenow', '100')
    pointer(el, 'pointerup', 400)
    expect(el).not.toHaveAttribute('data-state')
    expect(onDragEnd).toHaveBeenCalledWith(expect.anything(), 100)
    expect(onChange.mock.calls.map((call) => call[1])).toEqual([230, 300, 100])
  })

  it('a press without movement is not a drag', () => {
    const onDragEnd = vi.fn()
    render(<DragHandle aria-label="List" defaultValue={50} onDragEnd={onDragEnd} />)
    pointer(separator(), 'pointerdown', 10)
    pointer(separator(), 'pointerup', 10)
    expect(onDragEnd).not.toHaveBeenCalled()
  })

  it('works controlled', async () => {
    const user = userEvent.setup()
    function Controlled() {
      const [width, setWidth] = useState(240)
      return (
        <>
          <DragHandle
            aria-label="List"
            min={200}
            max={400}
            step={8}
            value={width}
            onChange={(_event, next) => setWidth(next)}
          />
          <output>{width}</output>
        </>
      )
    }
    render(<Controlled />)
    separator().focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByText('248')).toBeInTheDocument()
  })

  it('exposes aria-valuetext', () => {
    render(<DragHandle aria-label="List" max={600} defaultValue={320} getAriaValueText={(v) => `${v} pixels`} />)
    expect(separator()).toHaveAttribute('aria-valuetext', '320 pixels')
  })

  it('ignores input and leaves the tab order when disabled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DragHandle aria-label="List" defaultValue={50} disabled onChange={onChange} />)
    const el = separator()
    expect(el).toHaveAttribute('aria-disabled', 'true')
    expect(el).not.toHaveAttribute('tabindex')
    pointer(el, 'pointerdown', 0)
    pointer(el, 'pointermove', 40)
    el.focus()
    await user.keyboard('{ArrowRight}')
    expect(onChange).not.toHaveBeenCalled()
    expect(el).toHaveAttribute('aria-valuenow', '50')
  })

  it('has no axe violations (rest, dragged, disabled)', async () => {
    const { container } = render(
      <>
        <div id="pane">Pane</div>
        <DragHandle aria-label="Pane" aria-controls="pane" defaultValue={40} />
        <DragHandle aria-label="Second pane" defaultValue={40} disabled />
      </>,
    )
    pointer(screen.getAllByRole('separator')[0], 'pointerdown', 0)
    pointer(screen.getAllByRole('separator')[0], 'pointermove', 5)
    expect(await axe(container)).toHaveNoViolations()
  })
})
