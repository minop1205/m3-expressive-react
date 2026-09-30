import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { IconButton } from '../IconButton'
import { Toolbar } from './Toolbar'

const icon = <span aria-hidden="true">★</span>

describe('Toolbar', () => {
  it('renders a toolbar with its slots', () => {
    render(
      <Toolbar>
        <IconButton icon={icon} aria-label="Star" />
      </Toolbar>,
    )
    expect(screen.getByRole('toolbar')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Star' })).toBeInTheDocument()
  })

  it('defaults to the docked variant / standard color', () => {
    render(<Toolbar aria-label="Actions" />)
    const bar = screen.getByRole('toolbar')
    expect(bar).toHaveAttribute('data-variant', 'docked')
    expect(bar).toHaveAttribute('data-color', 'standard')
  })

  it('exposes orientation for floating toolbars', () => {
    render(<Toolbar variant="floating" orientation="vertical" aria-label="v" />)
    const bar = screen.getByRole('toolbar')
    expect(bar).toHaveAttribute('data-orientation', 'vertical')
    expect(bar).toHaveAttribute('aria-orientation', 'vertical')
  })

  it('supports the vibrant color scheme', () => {
    render(<Toolbar color="vibrant" aria-label="v" />)
    expect(screen.getByRole('toolbar')).toHaveAttribute('data-color', 'vibrant')
  })

  // Item layout (48dp slots, docked gap counted with `:has(> :nth-child(n))`)
  // and the color-scheme contract require items to be direct children.
  it('renders items as direct children of the toolbar', () => {
    render(
      <Toolbar color="vibrant" aria-label="Actions">
        <IconButton icon={icon} aria-label="A" variant="standard" />
        <IconButton icon={icon} aria-label="B" variant="standard" toggle defaultSelected />
      </Toolbar>,
    )
    const bar = screen.getByRole('toolbar')
    expect(screen.getByRole('button', { name: 'A' }).parentElement).toBe(bar)
    const b = screen.getByRole('button', { name: 'B' })
    expect(b.parentElement).toBe(bar)
    expect(b).toHaveAttribute('data-variant', 'standard')
    expect(b).toHaveAttribute('data-selected', 'true')
  })

  describe('keyboard', () => {
    const items = (
      <>
        <IconButton icon={icon} aria-label="A" variant="standard" />
        <IconButton icon={icon} aria-label="B" variant="standard" disabled />
        <IconButton icon={icon} aria-label="C" variant="standard" />
        <IconButton icon={icon} aria-label="D" variant="standard" />
      </>
    )
    const btn = (name: string) => screen.getByRole('button', { name })

    it('keeps every item in the Tab order (no roving tabindex)', async () => {
      const user = userEvent.setup()
      render(<Toolbar aria-label="t">{items}</Toolbar>)
      await user.tab()
      expect(btn('A')).toHaveFocus()
      await user.tab()
      expect(btn('C')).toHaveFocus()
      await user.tab()
      expect(btn('D')).toHaveFocus()
    })

    it('moves with Left / Right, skipping disabled items and wrapping', async () => {
      const user = userEvent.setup()
      render(<Toolbar aria-label="t">{items}</Toolbar>)
      btn('A').focus()
      await user.keyboard('{ArrowRight}')
      expect(btn('C')).toHaveFocus()
      await user.keyboard('{ArrowRight}{ArrowRight}')
      expect(btn('A')).toHaveFocus()
      await user.keyboard('{ArrowLeft}')
      expect(btn('D')).toHaveFocus()
      // Up / Down do nothing on a horizontal toolbar.
      await user.keyboard('{ArrowDown}')
      expect(btn('D')).toHaveFocus()
    })

    it('jumps with Home / End', async () => {
      const user = userEvent.setup()
      render(<Toolbar aria-label="t">{items}</Toolbar>)
      btn('C').focus()
      await user.keyboard('{End}')
      expect(btn('D')).toHaveFocus()
      await user.keyboard('{Home}')
      expect(btn('A')).toHaveFocus()
    })

    it('mirrors Left / Right in RTL', async () => {
      const user = userEvent.setup()
      render(
        <div dir="rtl">
          <Toolbar aria-label="t">{items}</Toolbar>
        </div>,
      )
      btn('A').focus()
      await user.keyboard('{ArrowLeft}')
      expect(btn('C')).toHaveFocus()
      await user.keyboard('{ArrowRight}')
      expect(btn('A')).toHaveFocus()
    })

    it('uses Up / Down on a vertical floating toolbar', async () => {
      const user = userEvent.setup()
      render(
        <Toolbar variant="floating" orientation="vertical" aria-label="t">
          {items}
        </Toolbar>,
      )
      btn('A').focus()
      await user.keyboard('{ArrowDown}')
      expect(btn('C')).toHaveFocus()
      await user.keyboard('{ArrowUp}')
      expect(btn('A')).toHaveFocus()
      await user.keyboard('{ArrowRight}')
      expect(btn('A')).toHaveFocus()
    })

    it('leaves the arrow keys to text fields', async () => {
      const user = userEvent.setup()
      render(
        <Toolbar aria-label="t">
          <IconButton icon={icon} aria-label="A" variant="standard" />
          <input aria-label="Find" defaultValue="abc" />
          <IconButton icon={icon} aria-label="C" variant="standard" />
        </Toolbar>,
      )
      const field = screen.getByRole('textbox', { name: 'Find' })
      field.focus()
      await user.keyboard('{ArrowLeft}{Home}')
      expect(field).toHaveFocus()
      // …but arrows from a neighbour still reach it.
      btn('A').focus()
      await user.keyboard('{ArrowRight}')
      expect(field).toHaveFocus()
    })

    it('still calls a user onKeyDown and respects preventDefault', async () => {
      const user = userEvent.setup()
      const onKeyDown = vi.fn((e: React.KeyboardEvent) => e.preventDefault())
      render(
        <Toolbar aria-label="t" onKeyDown={onKeyDown}>
          {items}
        </Toolbar>,
      )
      btn('A').focus()
      await user.keyboard('{ArrowRight}')
      expect(onKeyDown).toHaveBeenCalled()
      expect(btn('A')).toHaveFocus()
    })
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(<Toolbar ref={ref} aria-label="t" />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <Toolbar aria-label="Actions">
        <IconButton icon={icon} aria-label="Star" />
      </Toolbar>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
