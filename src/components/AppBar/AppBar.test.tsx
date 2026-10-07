import { createRef, useRef } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { SearchBar, type SearchBarProps } from '../SearchBar'
import { BottomAppBar, TopAppBar, type TopAppBarProps } from './AppBar'

describe('TopAppBar', () => {
  it('renders the title as a heading', () => {
    render(<TopAppBar title="Inbox" />)
    expect(screen.getByRole('heading', { name: 'Inbox' })).toBeInTheDocument()
  })

  it('renders navigation and action slots', () => {
    render(
      <TopAppBar
        title="T"
        navigationIcon={<button>Back</button>}
        actions={<button>More</button>}
      />,
    )
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'More' })).toBeInTheDocument()
  })

  // The slot CSS (48dp IconButton slots, `.nav + .titleBox` 56dp title start)
  // relies on this structure: nav slot → title → actions slot, buttons as
  // direct children of their slot.
  it('places nav, title and actions as adjacent row children', () => {
    render(
      <TopAppBar
        title="T"
        navigationIcon={<button>Back</button>}
        actions={
          <>
            <button>Search</button>
            <button>More</button>
          </>
        }
      />,
    )
    const back = screen.getByRole('button', { name: 'Back' })
    const titleBox = screen.getByRole('heading', { name: 'T' }).parentElement!
    const navSlot = back.parentElement!
    expect(navSlot.nextElementSibling).toBe(titleBox)
    const actionsSlot = titleBox.nextElementSibling!
    expect(screen.getByRole('button', { name: 'Search' }).parentElement).toBe(actionsSlot)
    expect(screen.getByRole('button', { name: 'More' }).parentElement).toBe(actionsSlot)
  })

  it('applies the variant', () => {
    render(<TopAppBar title="T" variant="large" />)
    expect(screen.getByRole('banner')).toHaveAttribute('data-variant', 'large')
  })

  it('renders a subtitle next to the title', () => {
    render(<TopAppBar title="Inbox" subtitle="3 unread" />)
    const heading = screen.getByRole('heading', { name: 'Inbox' })
    expect(heading).not.toHaveTextContent('3 unread')
    expect(heading.nextElementSibling).toHaveTextContent('3 unread')
    expect(screen.getByRole('banner')).toHaveAttribute('data-subtitle')
  })

  it('puts the medium / large title in the second row', () => {
    render(<TopAppBar title="T" subtitle="S" variant="medium" navigationIcon={<button>Back</button>} />)
    const bar = screen.getByRole('banner')
    const [row, expandedRow] = Array.from(bar.children)
    expect(row).toContainElement(screen.getByRole('button', { name: 'Back' }))
    expect(expandedRow).toContainElement(screen.getByRole('heading', { name: 'T' }))
    expect(expandedRow).toHaveTextContent('S')
  })

  it('defaults to a start-aligned small bar', () => {
    render(<TopAppBar title="T" />)
    const bar = screen.getByRole('banner')
    expect(bar).toHaveAttribute('data-variant', 'small')
    expect(bar).toHaveAttribute('data-title-alignment', 'start')
  })

  it('supports titleAlignment on every size', () => {
    render(<TopAppBar title="T" variant="large" titleAlignment="center" />)
    const bar = screen.getByRole('banner')
    expect(bar).toHaveAttribute('data-variant', 'large')
    expect(bar).toHaveAttribute('data-title-alignment', 'center')
  })

  it('keeps the deprecated variant="center" as small + centered title', () => {
    render(<TopAppBar title="T" variant="center" />)
    const bar = screen.getByRole('banner')
    expect(bar).toHaveAttribute('data-variant', 'small')
    expect(bar).toHaveAttribute('data-title-alignment', 'center')
  })

  it('lets titleAlignment override the deprecated center alias', () => {
    render(<TopAppBar title="T" variant="center" titleAlignment="start" />)
    expect(screen.getByRole('banner')).toHaveAttribute('data-title-alignment', 'start')
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLElement>()
    render(<TopAppBar ref={ref} title="T" />)
    expect(ref.current).toBeInstanceOf(HTMLElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <TopAppBar
        title="Accessible"
        subtitle="Subtitle"
        variant="large"
        navigationIcon={<button aria-label="Menu">m</button>}
        actions={<button aria-label="Search">s</button>}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('TopAppBar scrolling', () => {
  // jsdom has no layout: give every element a fixed height so the bar height
  // (enterAlways limit) and the second row (collapse range) are measurable.
  let heightSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    heightSpy = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(56)
  })
  afterEach(() => heightSpy.mockRestore())

  function Scroller(props: Pick<TopAppBarProps, 'variant' | 'scrollBehavior'>) {
    const ref = useRef<HTMLDivElement>(null)
    return (
      <div ref={ref} data-testid="scroller">
        <TopAppBar {...props} title="Title" scrollTarget={ref} />
      </div>
    )
  }

  const scrollTo = (el: HTMLElement, top: number) => {
    Object.defineProperty(el, 'scrollTop', { value: top, configurable: true })
    fireEvent.scroll(el)
  }

  it('renders the scrolled state from the prop', () => {
    render(<TopAppBar title="T" scrolled />)
    expect(screen.getByRole('banner')).toHaveAttribute('data-scrolled')
  })

  it('pinned: becomes sticky and scrolled once the content scrolls', async () => {
    render(<Scroller scrollBehavior="pinned" />)
    const bar = screen.getByRole('banner')
    expect(bar).toHaveAttribute('data-scroll-behavior', 'pinned')
    expect(bar).not.toHaveAttribute('data-scrolled')
    scrollTo(screen.getByTestId('scroller'), 10)
    await waitFor(() => expect(bar).toHaveAttribute('data-scrolled'))
    scrollTo(screen.getByTestId('scroller'), 0)
    await waitFor(() => expect(bar).not.toHaveAttribute('data-scrolled'))
  })

  it('enterAlways: follows the scroll delta and goes inert once hidden', async () => {
    render(<Scroller scrollBehavior="enterAlways" />)
    const bar = screen.getByRole('banner')
    const scroller = screen.getByTestId('scroller')
    // No transform at rest (it would trap fixed descendants, e.g. a scrim).
    expect(bar).not.toHaveAttribute('data-hide-offset')
    scrollTo(scroller, 20)
    await waitFor(() => expect(bar.style.getPropertyValue('--_hide-offset')).toBe('20px'))
    expect(bar).not.toHaveAttribute('inert')
    expect(bar).toHaveAttribute('data-hide-offset')
    scrollTo(scroller, 200)
    await waitFor(() => expect(bar).toHaveAttribute('inert'))
    expect(bar.style.getPropertyValue('--_hide-offset')).toBe('56px')
    // Scrolling back reveals it immediately.
    scrollTo(scroller, 190)
    await waitFor(() => expect(bar).not.toHaveAttribute('inert'))
    expect(bar.style.getPropertyValue('--_hide-offset')).toBe('46px')
  })

  it('enterAlways: settles a half-hidden bar when scrolling stops', async () => {
    render(<Scroller scrollBehavior="enterAlways" />)
    const bar = screen.getByRole('banner')
    scrollTo(screen.getByTestId('scroller'), 40)
    await waitFor(() => expect(bar.style.getPropertyValue('--_hide-offset')).toBe('56px'))
    expect(bar).toHaveAttribute('data-settling')
    expect(bar).toHaveAttribute('inert')
  })

  it('exitUntilCollapsed: collapses a large bar with the scroll position', async () => {
    render(<Scroller variant="large" scrollBehavior="exitUntilCollapsed" />)
    const bar = screen.getByRole('banner')
    scrollTo(screen.getByTestId('scroller'), 28)
    await waitFor(() => expect(bar.style.getPropertyValue('--_collapsed-fraction')).toBe('0.5'))
    expect(bar).toHaveAttribute('data-collapsing')
    // The top-row copy of the title is hidden from AT: one heading only.
    expect(screen.getAllByRole('heading')).toHaveLength(1)
    expect(screen.getAllByText('Title')).toHaveLength(2)
    scrollTo(screen.getByTestId('scroller'), 500)
    await waitFor(() => expect(bar.style.getPropertyValue('--_collapsed-fraction')).toBe('1'))
    scrollTo(screen.getByTestId('scroller'), 0)
    await waitFor(() => expect(bar).not.toHaveAttribute('data-collapsing'))
  })

  it('collapsedFraction only applies to medium / large bars', () => {
    const { rerender } = render(<TopAppBar title="T" collapsedFraction={1} />)
    expect(screen.getByRole('banner')).not.toHaveAttribute('data-collapsing')
    rerender(<TopAppBar title="T" variant="medium" collapsedFraction={1} />)
    expect(screen.getByRole('banner')).toHaveAttribute('data-collapsing')
  })

  it('hidden: slides out and goes inert; the native attribute is not set', () => {
    const { rerender } = render(<TopAppBar title="T" hidden />)
    const bar = document.querySelector('header')!
    expect(bar).toHaveAttribute('data-hidden', 'true')
    expect(bar).toHaveAttribute('inert')
    expect(bar).not.toHaveAttribute('hidden')
    rerender(<TopAppBar title="T" hidden={false} />)
    expect(bar).toHaveAttribute('data-hidden', 'false')
    expect(bar).not.toHaveAttribute('inert')
  })

  it('has no axe violations while collapsed', async () => {
    const { container } = render(
      <TopAppBar
        title="Collapsed"
        variant="medium"
        collapsedFraction={1}
        navigationIcon={<button aria-label="Menu">m</button>}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('TopAppBar variant="search"', () => {
  const field = (props: Partial<SearchBarProps> = {}) => (
    <SearchBar aria-label="Product search" placeholder="Search product" startIcon={false} {...props} />
  )

  it('renders the search field instead of a visible heading', () => {
    render(
      <TopAppBar
        variant="search"
        title="Products"
        subtitle="ignored"
        searchBar={field()}
        navigationIcon={<button aria-label="Menu">m</button>}
        actions={<button aria-label="Account">a</button>}
      />,
    )
    const bar = screen.getByRole('banner')
    expect(bar).toHaveAttribute('data-variant', 'search')
    // The title stays the page heading for assistive technology only.
    const heading = screen.getByRole('heading', { level: 1, name: 'Products' })
    expect(heading.className).toMatch(/visuallyHidden/)
    expect(screen.queryByText('ignored')).toBeNull()
    expect(bar).not.toHaveAttribute('data-subtitle')
    // nav → field → actions, field inside the search slot.
    const search = screen.getByRole('search', { name: 'Product search' })
    const slot = search.parentElement!
    expect(slot.className).toMatch(/searchSlot/)
    expect(screen.getByRole('button', { name: 'Menu' }).parentElement!.nextElementSibling).toBe(
      heading,
    )
    expect(slot.nextElementSibling).toBe(screen.getByRole('button', { name: 'Account' }).parentElement)
    // No leading icon inside the field.
    expect(search.querySelector('svg')).toBeNull()
  })

  it('renders no heading without a title', () => {
    render(<TopAppBar variant="search" searchBar={field()} />)
    expect(screen.queryByRole('heading')).toBeNull()
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('maps titleAlignment to the field text alignment', () => {
    render(<TopAppBar variant="search" titleAlignment="center" searchBar={field()} />)
    const bar = screen.getByRole('banner')
    expect(bar).toHaveAttribute('data-text-alignment', 'center')
    // The centered-title grid layout is not used on the search bar.
    expect(bar).not.toHaveAttribute('data-title-alignment')
  })

  it('reflects the scrolled state', () => {
    render(<TopAppBar variant="search" scrolled searchBar={field()} />)
    expect(screen.getByRole('banner')).toHaveAttribute('data-scrolled')
  })

  it('opens the search view through the composed SearchBar', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <TopAppBar
        variant="search"
        searchBar={field({
          onOpenChange,
          children: <button type="button">Recent: Headphones</button>,
        })}
      />,
    )
    const input = screen.getByRole('combobox')
    expect(input).toHaveAttribute('aria-expanded', 'false')
    await user.click(input)
    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(input).toHaveAttribute('aria-expanded', 'true')
  })

  it('has no axe violations (closed and with the search view open)', async () => {
    const { container, rerender } = render(
      <TopAppBar
        variant="search"
        title="Products"
        navigationIcon={<button aria-label="Menu">m</button>}
        actions={<button aria-label="Account">a</button>}
        searchBar={field({ endIcon: <button aria-label="Voice search">v</button> })}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
    rerender(
      <TopAppBar
        variant="search"
        title="Products"
        navigationIcon={<button aria-label="Menu">m</button>}
        actions={<button aria-label="Account">a</button>}
        searchBar={field({
          open: true,
          children: <button type="button">Recent: Headphones</button>,
        })}
      />,
    )
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true')
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('BottomAppBar', () => {
  it('renders actions and a FAB slot', () => {
    render(
      <BottomAppBar floatingActionButton={<button>Add</button>}>
        <button>A</button>
        <button>B</button>
      </BottomAppBar>,
    )
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'A' })).toBeInTheDocument()
  })

  it('keeps the actions as direct children of one slot (48dp slot layout)', () => {
    render(
      <BottomAppBar floatingActionButton={<button>Add</button>}>
        <button>A</button>
        <button>B</button>
      </BottomAppBar>,
    )
    const a = screen.getByRole('button', { name: 'A' })
    expect(screen.getByRole('button', { name: 'B' }).parentElement).toBe(a.parentElement)
    expect(screen.getByRole('button', { name: 'Add' }).parentElement).not.toBe(a.parentElement)
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(<BottomAppBar ref={ref}>x</BottomAppBar>)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <BottomAppBar floatingActionButton={<button aria-label="Add">+</button>}>
        <button aria-label="Menu">m</button>
      </BottomAppBar>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
