import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { BottomAppBar, TopAppBar } from './AppBar'

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
