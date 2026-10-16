import { createRef } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { Badge } from '../Badge/Badge'
import { Tab, Tabs } from './Tabs'

function Example({
  value = 'a',
  onChange = () => {},
  variant,
}: {
  value?: string
  onChange?: (event: React.MouseEvent<HTMLButtonElement>, v: string) => void
  variant?: 'primary' | 'secondary'
}) {
  return (
    <Tabs value={value} onChange={onChange} variant={variant} aria-label="Sections">
      <Tab value="a" label="Alpha" />
      <Tab value="b" label="Beta" />
      <Tab value="c" label="Gamma" />
    </Tabs>
  )
}

describe('Tabs', () => {
  it('renders a tablist with the selected tab marked', () => {
    render(<Example value="b" />)
    expect(screen.getByRole('tablist', { name: 'Sections' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Beta', selected: true })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Alpha', selected: false })).toBeInTheDocument()
  })

  it('uses roving tabindex (only the selected tab is tabbable)', () => {
    render(<Example value="b" />)
    expect(screen.getByRole('tab', { name: 'Beta' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('tabindex', '-1')
  })

  describe('fallback tab stop (value matches no enabled tab)', () => {
    const tabIndexes = () =>
      screen.getAllByRole('tab').map((t) => t.getAttribute('tabindex'))

    it('uses the first tab when there is no selection', async () => {
      const user = userEvent.setup()
      render(
        <Tabs aria-label="S">
          <Tab value="a" label="Alpha" />
          <Tab value="b" label="Beta" />
        </Tabs>,
      )
      expect(tabIndexes()).toEqual(['0', '-1'])
      await user.tab()
      expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveFocus()
    })

    it('uses the first tab when the controlled value is null', () => {
      render(<Example value={null as unknown as string} />)
      expect(tabIndexes()).toEqual(['0', '-1', '-1'])
    })

    it('uses the first tab when the value is stale', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<Example value="zzz" />)
      expect(tabIndexes()).toEqual(['0', '-1', '-1'])
      await user.tab()
      expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveFocus()
      await user.keyboard('{ArrowRight}')
      expect(tabIndexes()).toEqual(['-1', '0', '-1'])
      // A valid value takes the stop back once focus leaves.
      screen.getByRole('tab', { name: 'Beta' }).blur()
      rerender(<Example value="c" />)
      expect(tabIndexes()).toEqual(['-1', '-1', '0'])
    })

    it('skips a disabled first tab', async () => {
      const user = userEvent.setup()
      render(
        <Tabs value="zzz" onChange={() => {}} aria-label="S">
          <Tab value="a" label="Alpha" disabled />
          <Tab value="b" label="Beta" />
          <Tab value="c" label="Gamma" />
        </Tabs>,
      )
      expect(tabIndexes()).toEqual(['-1', '0', '-1'])
      await user.tab()
      expect(screen.getByRole('tab', { name: 'Beta' })).toHaveFocus()
    })

    it('falls back when the selected tab is disabled', () => {
      render(
        <Tabs value="a" onChange={() => {}} aria-label="S">
          <Tab value="a" label="Alpha" disabled />
          <Tab value="b" label="Beta" />
        </Tabs>,
      )
      expect(tabIndexes()).toEqual(['-1', '0'])
    })
  })

  it('selects on click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Example value="a" onChange={onChange} />)
    await user.click(screen.getByRole('tab', { name: 'Gamma' }))
    expect(onChange).toHaveBeenCalledWith(expect.any(Object), 'c')
  })

  it('does not fire onChange when the selected tab is clicked again', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Example value="a" onChange={onChange} />)
    await user.click(screen.getByRole('tab', { name: 'Alpha' }))
    screen.getByRole('tab', { name: 'Alpha' }).focus()
    await user.keyboard('{Enter} ')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('does not select when the tab onClick calls preventDefault()', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onClick = vi.fn((event: React.MouseEvent) => event.preventDefault())
    render(
      <Tabs defaultValue="a" onChange={onChange} aria-label="Sections">
        <Tab value="a" label="Alpha" />
        <Tab value="b" label="Beta" onClick={onClick} />
      </Tabs>,
    )
    await user.click(screen.getByRole('tab', { name: 'Beta' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true')
  })

  it('arrow keys move focus without selecting (manual activation)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Example value="a" onChange={onChange} />)
    screen.getByRole('tab', { name: 'Alpha' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Beta' })).toHaveFocus()
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Gamma' })).toHaveFocus() // wraps
    expect(onChange).not.toHaveBeenCalled()
  })

  it('selects the focused tab with Enter and Space', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Example value="a" onChange={onChange} />)
    screen.getByRole('tab', { name: 'Alpha' }).focus()
    await user.keyboard('{ArrowRight}{Enter}')
    expect(onChange).toHaveBeenLastCalledWith(expect.any(Object), 'b')
    await user.keyboard('{ArrowRight} ')
    expect(onChange).toHaveBeenLastCalledWith(expect.any(Object), 'c')
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('Home and End move focus to the first and last tab', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Example value="b" onChange={onChange} />)
    screen.getByRole('tab', { name: 'Beta' }).focus()
    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Gamma' })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveFocus()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('skips disabled tabs', async () => {
    const user = userEvent.setup()
    render(
      <Tabs value="a" onChange={() => {}} aria-label="S">
        <Tab value="a" label="Alpha" />
        <Tab value="b" label="Beta" disabled />
        <Tab value="c" label="Gamma" />
        <Tab value="d" label="Delta" disabled />
      </Tabs>,
    )
    screen.getByRole('tab', { name: 'Alpha' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Gamma' })).toHaveFocus()
    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Gamma' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveFocus()
  })

  it('reverses the arrow keys in RTL', async () => {
    const user = userEvent.setup()
    render(
      <div dir="rtl">
        <Example value="a" />
      </div>,
    )
    screen.getByRole('tab', { name: 'Alpha' }).focus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Beta' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveFocus()
  })

  it('moves the tab stop with focus and restores it to the selected tab on leave', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Example value="a" />
        <button type="button">After</button>
      </>,
    )
    await user.tab()
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Beta' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('tabindex', '-1')
    // Tab leaves the tablist (one tab stop), then the stop returns to the selection.
    await user.tab()
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'Beta' })).toHaveAttribute('tabindex', '-1')
    await user.tab({ shift: true })
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveFocus()
  })

  it('supports the secondary variant', () => {
    render(<Example variant="secondary" />)
    expect(screen.getByRole('tablist')).toHaveAttribute('data-variant', 'secondary')
  })

  it('supports scrollable tabs', () => {
    render(
      <Tabs value="a" onChange={() => {}} scrollable aria-label="S">
        <Tab value="a" label="Alpha" />
        <Tab value="b" label="Beta" />
      </Tabs>,
    )
    expect(screen.getByRole('tablist')).toHaveAttribute('data-scrollable', 'true')
  })

  it('renders a single decorative indicator for the row', () => {
    const { container, rerender } = render(<Example value="b" />)
    const indicators = container.querySelectorAll('[role="tablist"] > [aria-hidden="true"]')
    expect(indicators).toHaveLength(1)
    expect(indicators[0]).not.toHaveAttribute('hidden')
    // No tab matches the value → nothing to point at.
    rerender(<Example value="zzz" />)
    expect(indicators[0]).toHaveAttribute('hidden')
  })

  it('scrolls the selected scrollable tab into the center on selection change', () => {
    const scrollBy = vi.fn()
    const original = Element.prototype.scrollBy
    Element.prototype.scrollBy = scrollBy
    try {
      const { rerender } = render(
        <Tabs value="a" onChange={() => {}} scrollable aria-label="S">
          <Tab value="a" label="Alpha" />
          <Tab value="b" label="Beta" />
        </Tabs>,
      )
      // First layout snaps instantly.
      expect(scrollBy).toHaveBeenCalledTimes(1)
      expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'instant' }))
      rerender(
        <Tabs value="b" onChange={() => {}} scrollable aria-label="S">
          <Tab value="a" label="Alpha" />
          <Tab value="b" label="Beta" />
        </Tabs>,
      )
      expect(scrollBy).toHaveBeenCalledTimes(2)
      expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'smooth' }))
    } finally {
      Element.prototype.scrollBy = original
    }
  })

  it('re-centers the scrollable row on resize until the user scrolls it', () => {
    const scrollBy = vi.fn()
    const original = Element.prototype.scrollBy
    Element.prototype.scrollBy = scrollBy
    const callbacks: ResizeObserverCallback[] = []
    const OriginalRO = globalThis.ResizeObserver
    globalThis.ResizeObserver = class {
      constructor(cb: ResizeObserverCallback) {
        callbacks.push(cb)
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
    const resize = () =>
      act(() => callbacks.forEach((cb) => cb([], {} as ResizeObserver)))
    try {
      render(
        <Tabs value="b" onChange={() => {}} scrollable aria-label="S">
          <Tab value="a" label="Alpha" />
          <Tab value="b" label="Beta" />
        </Tabs>,
      )
      expect(scrollBy).toHaveBeenCalledTimes(1)
      // Web fonts load → tab widths change → keep the selection centered.
      resize()
      expect(scrollBy).toHaveBeenCalledTimes(2)
      expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'instant' }))
      // Once the user scrolls the row, resizes leave the position alone.
      fireEvent.wheel(screen.getByRole('tablist'))
      resize()
      expect(scrollBy).toHaveBeenCalledTimes(2)
    } finally {
      Element.prototype.scrollBy = original
      globalThis.ResizeObserver = OriginalRO
    }
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <Tabs ref={ref} value="a" onChange={() => {}}>
        <Tab value="a" label="A" />
      </Tabs>,
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(<Example />)
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('Tabs uncontrolled mode', () => {
  it('selects via defaultValue and updates on click without value', async () => {
    const user = userEvent.setup()
    render(
      <Tabs defaultValue="one" aria-label="Sections">
        <Tab value="one" label="One" />
        <Tab value="two" label="Two" />
      </Tabs>,
    )
    expect(screen.getByRole('tab', { name: 'One' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('tab', { name: 'Two' }))
    expect(screen.getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'One' })).toHaveAttribute('aria-selected', 'false')
  })
})

describe('Tab iconPosition and badge (#443)', () => {
  const Icon = <svg data-testid="icon" />

  /**
   * Fakes layout: tabs are 200 wide; a measured content box is 80 (icon +
   * label), 24 (icon) or 40 (label); a badge is 30; everything else 0.
   */
  function fakeLayout() {
    return vi
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: Element) {
        let width = 0
        if (this.getAttribute('role') === 'tab') width = 200
        else if (this.hasAttribute('data-tab-content')) {
          const hasIcon = this.querySelector('svg') !== null
          const hasLabel = this.textContent?.includes('Alpha') === true
          width = hasIcon && hasLabel ? 80 : hasIcon ? 24 : 40
        } else if (this.matches('[data-size]') || this.querySelector('[data-size]')) width = 30
        return { x: 0, y: 0, left: 0, top: 0, right: width, bottom: 0, width, height: 0, toJSON() {} }
      })
  }

  const indicatorWidth = (container: HTMLElement) =>
    container.querySelector<HTMLElement>('[role="tablist"] > span[aria-hidden="true"]')!.style.width

  it('defaults to a stacked icon (top)', () => {
    render(
      <Tabs value="a" aria-label="S">
        <Tab value="a" label="Alpha" icon={Icon} />
      </Tabs>,
    )
    const tab = screen.getByRole('tab', { name: 'Alpha' })
    expect(tab).toHaveAttribute('data-with-icon', 'true')
    expect(tab).not.toHaveAttribute('data-icon-position')
    expect(tab.querySelectorAll('[data-tab-content]')).toHaveLength(2)
  })

  it('keeps an icon-only tab at the 48dp height (#484)', () => {
    render(
      <Tabs value="a" aria-label="S">
        <Tab value="a" icon={Icon} aria-label="Alpha" />
      </Tabs>,
    )
    const tab = screen.getByRole('tab', { name: 'Alpha' })
    expect(tab).not.toHaveAttribute('data-with-icon')
    expect(getComputedStyle(tab).minHeight).toBe('48px')
  })

  it('iconPosition="start" groups the icon and label into one content box', () => {
    render(
      <Tabs value="a" aria-label="S">
        <Tab value="a" label="Alpha" icon={Icon} iconPosition="start" />
      </Tabs>,
    )
    const tab = screen.getByRole('tab', { name: 'Alpha' })
    expect(tab).toHaveAttribute('data-icon-position', 'start')
    const content = tab.querySelectorAll('[data-tab-content]')
    expect(content).toHaveLength(1)
    expect(content[0]).toContainElement(screen.getByTestId('icon'))
    expect(content[0]).toHaveTextContent('Alpha')
  })

  it('sizes the primary indicator to the content box, never to the badge', () => {
    const spy = fakeLayout()
    try {
      const leading = render(
        <Tabs value="a" aria-label="S">
          <Tab value="a" label="Alpha" icon={Icon} iconPosition="start" badge={<Badge value={3} />} />
        </Tabs>,
      )
      expect(indicatorWidth(leading.container)).toBe('80px')
      leading.unmount()
      const textOnly = render(
        <Tabs value="a" aria-label="S">
          <Tab value="a" label="Alpha" badge={<Badge value={3} />} />
        </Tabs>,
      )
      expect(indicatorWidth(textOnly.container)).toBe('40px')
      textOnly.unmount()
      const stacked = render(
        <Tabs value="a" aria-label="S">
          <Tab value="a" label="Alpha" icon={Icon} badge={<Badge value={3} />} />
        </Tabs>,
      )
      expect(indicatorWidth(stacked.container)).toBe('40px')
    } finally {
      spy.mockRestore()
    }
  })

  // Browsers compute "Inbox 3 new notifications"; jsdom trims the hidden
  // suffix's leading space, hence the optional space (as NavigationBar).
  it('places the badge on the icon and reads it after the label', () => {
    render(
      <Tabs value="a" aria-label="S">
        <Tab value="a" label="Inbox" icon={Icon} badge={<Badge value={3} />} />
      </Tabs>,
    )
    const tab = screen.getByRole('tab', { name: /^Inbox ?3 new notifications$/ })
    const icon = screen.getByTestId('icon').parentElement!
    // The painted badge lives in the (decorative) icon box.
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(icon.querySelector('[data-size="large"]')).toHaveTextContent('3')
    expect(tab.querySelectorAll('[data-tab-content]')).toHaveLength(2)
  })

  it('places the badge after the label of a text-only tab, outside the measured content', () => {
    render(
      <Tabs value="a" aria-label="S">
        <Tab value="a" label="Inbox" badge={<Badge size="small" />} />
      </Tabs>,
    )
    const tab = screen.getByRole('tab', { name: /^Inbox ?New notification$/ })
    const content = tab.querySelectorAll('[data-tab-content]')
    expect(content).toHaveLength(1)
    expect(content[0]).toHaveTextContent(/^Inbox$/)
    const dot = tab.querySelector('[data-size="small"]')!
    expect(dot.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('uses the Badge label override and drops hidden badges from the name', () => {
    const { rerender } = render(
      <Tabs value="a" aria-label="S">
        <Tab value="a" label="Inbox" icon={Icon} badge={<Badge value={1200} label="Lots unread" />} />
        <Tab value="b" label="Spam" badge={<Badge value={2} visible={false} />} />
        <Tab value="c" label="Sent" badge={<Badge value={1} />} />
      </Tabs>,
    )
    expect(screen.getByRole('tab', { name: /^Inbox ?Lots unread$/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Spam' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^Sent ?1 new notification$/ })).toBeInTheDocument()
    rerender(
      <Tabs value="a" aria-label="S">
        <Tab value="a" label="Inbox" icon={Icon} badge={<Badge value={1200} />} />
      </Tabs>,
    )
    expect(screen.getByRole('tab', { name: /^Inbox ?999\+ new notifications$/ })).toBeInTheDocument()
  })

  it('has no axe violations with leading icons and badges', async () => {
    const { container } = render(
      <Tabs value="a" aria-label="S">
        <Tab value="a" label="Inbox" icon={Icon} iconPosition="start" badge={<Badge value={3} />} />
        <Tab value="b" label="Spam" icon={Icon} badge={<Badge size="small" />} />
        <Tab value="c" label="Sent" badge={<Badge value={12} />} />
        <Tab value="d" label="Drafts" badge={<Badge value={1} />} disabled />
      </Tabs>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
