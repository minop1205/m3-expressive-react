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

  // The slot CSS (48dp IconButton slots, `.nav + .title` 56dp title start)
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
    const heading = screen.getByRole('heading', { name: 'T' })
    const navSlot = back.parentElement!
    expect(navSlot.nextElementSibling).toBe(heading)
    const actionsSlot = heading.nextElementSibling!
    expect(screen.getByRole('button', { name: 'Search' }).parentElement).toBe(actionsSlot)
    expect(screen.getByRole('button', { name: 'More' }).parentElement).toBe(actionsSlot)
  })

  it('applies the variant', () => {
    render(<TopAppBar title="T" variant="large" />)
    expect(screen.getByRole('banner')).toHaveAttribute('data-variant', 'large')
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
