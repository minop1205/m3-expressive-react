import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { Button } from '../Button'
import { IconButton } from '../IconButton'
import { ButtonGroup } from './ButtonGroup'
import { pressedWidths } from './usePressWidth'

describe('pressedWidths (Compose ButtonGroup measure policy)', () => {
  it('grows a middle item by 15%, half from each neighbour', () => {
    expect(pressedWidths([100, 100, 100], [16, 16, 16], 1)).toEqual([92.5, 115, 92.5])
  })

  it('takes the whole growth from the one neighbour of an edge item', () => {
    expect(pressedWidths([100, 80, 100], [16, 16, 16], 0)).toEqual([115, 65, 100])
    expect(pressedWidths([100, 80, 100], [16, 16, 16], 2)).toEqual([100, 65, 115])
  })

  it('caps the growth at the neighbours’ compression limit', () => {
    expect(pressedWidths([200, 200, 200], [8, 16, 12], 1)).toEqual([192, 216, 192])
    expect(pressedWidths([200, 40], [8, 8], 0)).toEqual([208, 32])
  })

  it('keeps the total width constant', () => {
    const widths = [64, 90, 72, 48]
    for (let i = 0; i < widths.length; i++) {
      const next = pressedWidths(widths, [16, 16, 16, 8], i)
      expect(next.reduce((a, b) => a + b)).toBeCloseTo(widths.reduce((a, b) => a + b))
    }
  })

  it('leaves a single item unchanged', () => {
    expect(pressedWidths([100], [16], 0)).toEqual([100])
  })
})

describe('ButtonGroup', () => {
  it('renders its buttons inside a group', () => {
    render(
      <ButtonGroup>
        <Button>One</Button>
        <Button>Two</Button>
      </ButtonGroup>,
    )
    const group = screen.getByRole('group')
    expect(group).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'One' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Two' })).toBeInTheDocument()
  })

  it('defaults to the standard variant / sm size', () => {
    render(
      <ButtonGroup>
        <Button>One</Button>
      </ButtonGroup>,
    )
    const group = screen.getByRole('group')
    expect(group).toHaveAttribute('data-variant', 'standard')
    expect(group).toHaveAttribute('data-size', 'sm')
  })

  it('supports the connected variant', () => {
    render(
      <ButtonGroup variant="connected">
        <Button>One</Button>
        <Button>Two</Button>
      </ButtonGroup>,
    )
    expect(screen.getByRole('group')).toHaveAttribute('data-variant', 'connected')
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <ButtonGroup ref={ref}>
        <Button>One</Button>
      </ButtonGroup>,
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('does not animate widths in jsdom (no Element.animate) and keeps buttons usable', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <ButtonGroup>
        <Button onClick={onClick}>One</Button>
        <Button>Two</Button>
      </ButtonGroup>,
    )
    await user.click(screen.getByRole('button', { name: 'One' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('widens the pressed button and narrows its neighbours (standard)', () => {
    const animate = vi.fn(() => ({ cancel: vi.fn(), reverse: vi.fn() }) as unknown as Animation)
    const original = HTMLElement.prototype.animate
    const rect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ width: 100 } as DOMRect)
    HTMLElement.prototype.animate = animate as unknown as typeof original
    try {
      const pad = { paddingInlineStart: '16px' }
      render(
        <ButtonGroup>
          <Button style={pad}>One</Button>
          <Button style={pad}>Two</Button>
          <Button style={pad}>Three</Button>
        </ButtonGroup>,
      )
      fireEvent.pointerDown(screen.getByRole('button', { name: 'Two' }), { button: 0 })
      const widths = animate.mock.calls.map(
        (call) => (call as unknown as [Keyframe[]])[0][1].width,
      )
      // Middle item: +15% (7.5 from each side), group width unchanged.
      expect(widths).toEqual(['92.5px', '115px', '92.5px'])
    } finally {
      HTMLElement.prototype.animate = original
      rect.mockRestore()
    }
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <ButtonGroup aria-label="Text style">
        <Button variant="outlined">Bold</Button>
        <Button variant="outlined">Italic</Button>
        <Button variant="outlined">Underline</Button>
      </ButtonGroup>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('lets consumers override the role', () => {
    render(
      <ButtonGroup role="toolbar" aria-label="Formatting">
        <Button>One</Button>
      </ButtonGroup>,
    )
    expect(screen.getByRole('toolbar')).toHaveAttribute('data-variant', 'standard')
  })
})

describe('ButtonGroup keyboard (no selection model)', () => {
  it('moves focus with Left / Right and keeps every button tabbable', async () => {
    const user = userEvent.setup()
    render(
      <ButtonGroup>
        <Button>One</Button>
        <Button disabled>Two</Button>
        <Button>Three</Button>
      </ButtonGroup>,
    )
    const [one, , three] = screen.getAllByRole('button')
    one.focus()
    await user.keyboard('{ArrowRight}')
    expect(three).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(one).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(three).toHaveFocus()
    await user.keyboard('{Home}')
    expect(one).toHaveFocus()
    await user.keyboard('{End}')
    expect(three).toHaveFocus()
    // Arrow keys add to, not replace, Tab navigation.
    expect(one).not.toHaveAttribute('tabindex')
    await user.tab({ shift: true })
    expect(one).toHaveFocus()
  })

  it('uses Up / Down when vertical and ignores Left / Right', async () => {
    const user = userEvent.setup()
    render(
      <ButtonGroup orientation="vertical">
        <Button>One</Button>
        <Button>Two</Button>
      </ButtonGroup>,
    )
    const [one, two] = screen.getAllByRole('button')
    one.focus()
    await user.keyboard('{ArrowRight}')
    expect(one).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(two).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(one).toHaveFocus()
  })

  it('mirrors Left / Right in RTL', async () => {
    const user = userEvent.setup()
    render(
      <ButtonGroup style={{ direction: 'rtl' }}>
        <Button>One</Button>
        <Button>Two</Button>
        <Button>Three</Button>
      </ButtonGroup>,
    )
    const [one, two] = screen.getAllByRole('button')
    one.focus()
    await user.keyboard('{ArrowLeft}')
    expect(two).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(one).toHaveFocus()
  })
})

describe('ButtonGroup selectionMode="single"', () => {
  const Days = (props: { selectionRequired?: boolean; onChange?: () => void }) => (
    <ButtonGroup
      variant="connected"
      selectionMode="single"
      defaultValue="week"
      aria-label="View"
      {...props}
    >
      <Button value="day">Day</Button>
      <Button value="week">Week</Button>
      <Button value="month">Month</Button>
    </ButtonGroup>
  )

  it('exposes a radiogroup of radios with aria-checked', () => {
    render(<Days />)
    expect(screen.getByRole('radiogroup', { name: 'View' })).toBeInTheDocument()
    const radios = screen.getAllByRole('radio')
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false'])
    expect(radios[0]).not.toHaveAttribute('aria-pressed')
    expect(radios[1]).toHaveAttribute('data-selected', 'true')
  })

  it('selects on click and reports onChange(event, value)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Days onChange={onChange} />)
    await user.click(screen.getByRole('radio', { name: 'Day' }))
    expect(onChange).toHaveBeenLastCalledWith(expect.anything(), 'day')
    expect(screen.getByRole('radio', { name: 'Day' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Week' })).toHaveAttribute('aria-checked', 'false')
  })

  it('deselects the selected item unless selectionRequired', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { unmount } = render(<Days onChange={onChange} />)
    await user.click(screen.getByRole('radio', { name: 'Week' }))
    expect(onChange).toHaveBeenLastCalledWith(expect.anything(), null)
    expect(screen.getByRole('radio', { name: 'Week' })).toHaveAttribute('aria-checked', 'false')
    unmount()

    onChange.mockClear()
    render(<Days selectionRequired onChange={onChange} />)
    await user.click(screen.getByRole('radio', { name: 'Week' }))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('radio', { name: 'Week' })).toHaveAttribute('aria-checked', 'true')
  })

  it('uses a roving tab stop on the selected radio', () => {
    render(<Days />)
    const radios = screen.getAllByRole('radio')
    expect(radios.map((r) => r.tabIndex)).toEqual([-1, 0, -1])
  })

  it('puts the tab stop on the first enabled radio when none is selected', () => {
    render(
      <ButtonGroup selectionMode="single" aria-label="View">
        <Button value="day" disabled>
          Day
        </Button>
        <Button value="week">Week</Button>
      </ButtonGroup>,
    )
    expect(screen.getAllByRole('radio').map((r) => r.tabIndex)).toEqual([-1, 0])
  })

  it('moves focus and selection with the arrow keys, wrapping and skipping disabled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <ButtonGroup selectionMode="single" defaultValue="a" onChange={onChange} aria-label="X">
        <Button value="a">A</Button>
        <Button value="b" disabled>
          B
        </Button>
        <Button value="c">C</Button>
      </ButtonGroup>,
    )
    const [a, , c] = screen.getAllByRole('radio')
    a.focus()
    await user.keyboard('{ArrowRight}')
    expect(c).toHaveFocus()
    expect(c).toHaveAttribute('aria-checked', 'true')
    expect(c.tabIndex).toBe(0)
    expect(a.tabIndex).toBe(-1)
    expect(onChange).toHaveBeenLastCalledWith(expect.anything(), 'c')
    await user.keyboard('{ArrowDown}')
    expect(a).toHaveFocus()
    expect(a).toHaveAttribute('aria-checked', 'true')
    await user.keyboard('{ArrowUp}')
    expect(c).toHaveFocus()
  })

  it('supports the controlled pattern', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <ButtonGroup selectionMode="single" value="a" onChange={onChange} aria-label="X">
        <Button value="a">A</Button>
        <Button value="b">B</Button>
      </ButtonGroup>,
    )
    await user.click(screen.getByRole('radio', { name: 'B' }))
    expect(onChange).toHaveBeenCalledWith(expect.anything(), 'b')
    expect(screen.getByRole('radio', { name: 'A' })).toHaveAttribute('aria-checked', 'true')
  })

  it('keeps a disabled selected radio checked but out of the tab order', () => {
    render(
      <ButtonGroup selectionMode="single" defaultValue="a" aria-label="X">
        <Button value="a" disabled>
          A
        </Button>
        <Button value="b">B</Button>
      </ButtonGroup>,
    )
    const [a, b] = screen.getAllByRole('radio')
    expect(a).toBeDisabled()
    expect(a).toHaveAttribute('aria-checked', 'true')
    expect(a).toHaveAttribute('data-selected', 'true')
    expect(b.tabIndex).toBe(0)
  })

  it('also drives IconButton items and still calls their own onChange', async () => {
    const user = userEvent.setup()
    const itemChange = vi.fn()
    render(
      <ButtonGroup selectionMode="single" aria-label="Align">
        <IconButton value="left" icon={<span>L</span>} aria-label="Left" onChange={itemChange} />
        <IconButton value="right" icon={<span>R</span>} aria-label="Right" />
      </ButtonGroup>,
    )
    await user.click(screen.getByRole('radio', { name: 'Left' }))
    expect(itemChange).toHaveBeenCalledWith(expect.anything(), true)
    expect(screen.getByRole('radio', { name: 'Left' })).toHaveAttribute('aria-checked', 'true')
  })

  it('has no axe violations', async () => {
    const { container } = render(<Days />)
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('ButtonGroup selectionMode="multiple"', () => {
  it('exposes toggle buttons and reports the selected array', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <ButtonGroup selectionMode="multiple" defaultValue={['bold']} onChange={onChange}>
        <Button value="bold">Bold</Button>
        <Button value="italic">Italic</Button>
      </ButtonGroup>,
    )
    expect(screen.getByRole('group')).toBeInTheDocument()
    const bold = screen.getByRole('button', { name: 'Bold' })
    const italic = screen.getByRole('button', { name: 'Italic' })
    expect(bold).toHaveAttribute('aria-pressed', 'true')
    expect(italic).toHaveAttribute('aria-pressed', 'false')
    await user.click(italic)
    expect(onChange).toHaveBeenLastCalledWith(expect.anything(), ['bold', 'italic'])
    await user.click(bold)
    expect(onChange).toHaveBeenLastCalledWith(expect.anything(), ['italic'])
    expect(bold).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps the last item selected with selectionRequired', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <ButtonGroup selectionMode="multiple" defaultValue={['bold']} selectionRequired onChange={onChange}>
        <Button value="bold">Bold</Button>
        <Button value="italic">Italic</Button>
      </ButtonGroup>,
    )
    await user.click(screen.getByRole('button', { name: 'Bold' }))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('leaves buttons without a value as plain buttons', () => {
    render(
      <ButtonGroup selectionMode="multiple">
        <Button value="bold">Bold</Button>
        <Button>Clear</Button>
      </ButtonGroup>,
    )
    expect(screen.getByRole('button', { name: 'Clear' })).not.toHaveAttribute('aria-pressed')
  })

  it('does not select with the arrow keys', async () => {
    const user = userEvent.setup()
    render(
      <ButtonGroup selectionMode="multiple">
        <Button value="bold">Bold</Button>
        <Button value="italic">Italic</Button>
      </ButtonGroup>,
    )
    screen.getByRole('button', { name: 'Bold' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: 'Italic' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Italic' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <ButtonGroup variant="connected" selectionMode="multiple" defaultValue={['b']} aria-label="Style">
        <Button value="b">Bold</Button>
        <Button value="i" disabled>
          Italic
        </Button>
      </ButtonGroup>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
