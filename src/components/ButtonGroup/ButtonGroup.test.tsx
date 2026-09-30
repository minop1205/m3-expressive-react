import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { Button } from '../Button'
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
})
