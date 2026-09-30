import { createRef, useRef } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { IconButton } from '../IconButton'
import { Toolbar, type ToolbarProps } from './Toolbar'

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

  describe('expand / collapse', () => {
    const start = [<IconButton key="a" icon={icon} aria-label="A" variant="standard" />]
    const end = [<IconButton key="c" icon={icon} aria-label="C" variant="standard" />]

    it('is expanded by default and makes collapsed content inert', () => {
      const { rerender } = render(
        <Toolbar variant="floating" aria-label="t" startContent={start} endContent={end}>
          <IconButton icon={icon} aria-label="B" variant="standard" />
        </Toolbar>,
      )
      const bar = screen.getByRole('toolbar')
      expect(bar).toHaveAttribute('data-expanded', 'true')
      expect(bar.querySelectorAll('[inert]')).toHaveLength(0)
      rerender(
        <Toolbar variant="floating" aria-label="t" startContent={start} endContent={end} expanded={false}>
          <IconButton icon={icon} aria-label="B" variant="standard" />
        </Toolbar>,
      )
      expect(bar).toHaveAttribute('data-expanded', 'false')
      expect(bar.querySelectorAll('[inert]')).toHaveLength(2)
      expect(screen.getByRole('button', { name: 'B' }).closest('[inert]')).toBeNull()
    })

    it('supports defaultExpanded (uncontrolled)', () => {
      render(<Toolbar variant="floating" aria-label="t" startContent={start} defaultExpanded={false} />)
      const bar = screen.getByRole('toolbar')
      expect(bar).toHaveAttribute('data-expanded', 'false')
      expect(bar).toHaveAttribute('data-empty')
    })

    it('moves focus out of content that collapses', () => {
      const { rerender } = render(
        <Toolbar variant="floating" aria-label="t" startContent={start}>
          <IconButton icon={icon} aria-label="B" variant="standard" />
        </Toolbar>,
      )
      screen.getByRole('button', { name: 'A' }).focus()
      rerender(
        <Toolbar variant="floating" aria-label="t" startContent={start} expanded={false}>
          <IconButton icon={icon} aria-label="B" variant="standard" />
        </Toolbar>,
      )
      expect(screen.getByRole('button', { name: 'B' })).toHaveFocus()
    })

    it('renders start / end content as plain items on a docked toolbar', () => {
      render(<Toolbar aria-label="t" startContent={start} endContent={end} />)
      const bar = screen.getByRole('toolbar')
      expect(screen.getByRole('button', { name: 'A' }).parentElement).toBe(bar)
      expect(bar).not.toHaveAttribute('data-expanded')
    })
  })

  describe('scrolling', () => {
    function Scroller(props: ToolbarProps) {
      const ref = useRef<HTMLDivElement>(null)
      return (
        <div ref={ref} data-testid="scroller">
          <Toolbar aria-label="t" {...props} scrollTarget={ref}>
            <IconButton icon={icon} aria-label="B" variant="standard" />
          </Toolbar>
        </div>
      )
    }
    const scrollTo = (top: number) => {
      const el = screen.getByTestId('scroller')
      Object.defineProperty(el, 'scrollTop', { value: top, configurable: true })
      fireEvent.scroll(el)
    }

    it('collapse: collapses after 40px forward and expands after 40px back', async () => {
      const onExpandedChange = vi.fn()
      render(
        <Scroller
          variant="floating"
          scrollBehavior="collapse"
          startContent={[<IconButton key="a" icon={icon} aria-label="A" variant="standard" />]}
          onExpandedChange={onExpandedChange}
        />,
      )
      const bar = screen.getByRole('toolbar')
      scrollTo(30)
      await new Promise((r) => setTimeout(r, 40))
      expect(bar).toHaveAttribute('data-expanded', 'true')
      scrollTo(60)
      await waitFor(() => expect(bar).toHaveAttribute('data-expanded', 'false'))
      expect(onExpandedChange).toHaveBeenLastCalledWith(false)
      scrollTo(10)
      await waitFor(() => expect(bar).toHaveAttribute('data-expanded', 'true'))
      expect(onExpandedChange).toHaveBeenLastCalledWith(true)
    })

    it('exitAlways: slides off by the scroll delta and goes inert when fully hidden', async () => {
      // jsdom has no layout: the toolbar rests 64px above the scroller bottom
      // and its rect follows the applied translateY (--_hide-offset).
      const rect = vi
        .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
        .mockImplementation(function (this: HTMLElement) {
          if (this.getAttribute('role') !== 'toolbar') {
            return { top: 0, bottom: 500, left: 0, right: 400 } as DOMRect
          }
          const offset = parseFloat(this.style.getPropertyValue('--_hide-offset')) || 0
          return { top: 436 + offset, bottom: 500 + offset, left: 0, right: 400 } as DOMRect
        })
      try {
        render(<Scroller variant="docked" scrollBehavior="exitAlways" />)
        const bar = screen.getByRole('toolbar')
        expect(bar).toHaveAttribute('data-exit-direction', 'bottom')
        scrollTo(20)
        await waitFor(() => expect(bar.style.getPropertyValue('--_hide-offset')).toBe('20px'))
        scrollTo(300)
        await waitFor(() => expect(bar).toHaveAttribute('inert'))
        expect(bar.style.getPropertyValue('--_hide-offset')).toBe('64px')
        scrollTo(280)
        await waitFor(() => expect(bar).not.toHaveAttribute('inert'))
      } finally {
        rect.mockRestore()
      }
    })

    it('hidden: inert without the native attribute', () => {
      render(<Toolbar aria-label="t" hidden />)
      const bar = screen.getByRole('toolbar', { hidden: true })
      expect(bar).toHaveAttribute('inert')
      expect(bar).toHaveAttribute('data-hidden', 'true')
      expect(bar).not.toHaveAttribute('hidden')
    })
  })

  it('has no axe violations when collapsed', async () => {
    const { container } = render(
      <Toolbar
        variant="floating"
        aria-label="Actions"
        expanded={false}
        startContent={[<IconButton key="a" icon={icon} aria-label="A" variant="standard" />]}
      >
        <IconButton icon={icon} aria-label="Star" />
      </Toolbar>,
    )
    expect(await axe(container)).toHaveNoViolations()
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
