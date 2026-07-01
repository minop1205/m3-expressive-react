import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { List, ListItem } from './List'

describe('List / ListItem', () => {
  it('renders a list with items', () => {
    render(
      <List aria-label="Items">
        <ListItem headline="First" />
        <ListItem headline="Second" />
      </List>,
    )
    expect(screen.getByRole('list', { name: 'Items' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('computes the line count from content', () => {
    const { rerender } = render(<ListItem headline="H" />)
    expect(screen.getByRole('listitem')).toHaveAttribute('data-lines', '1')
    rerender(<ListItem headline="H" supportingText="S" />)
    expect(screen.getByRole('listitem')).toHaveAttribute('data-lines', '2')
    rerender(<ListItem headline="H" overline="O" supportingText="S" />)
    expect(screen.getByRole('listitem')).toHaveAttribute('data-lines', '3')
  })

  it('renders overline, supporting, and trailing text', () => {
    render(
      <ListItem
        headline="H"
        overline="OVER"
        supportingText="Support"
        trailingSupportingText="99+"
      />,
    )
    expect(screen.getByText('OVER')).toBeInTheDocument()
    expect(screen.getByText('Support')).toBeInTheDocument()
    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('becomes interactive with onClick and fires on click/keyboard', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<ListItem headline="Go" onClick={onClick} />)
    const item = screen.getByRole('button', { name: /Go/ })
    await user.click(item)
    item.focus()
    await user.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it('does not fire when disabled', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const onClick = vi.fn()
    render(<ListItem headline="Go" onClick={onClick} disabled />)
    await user.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('forwards refs', () => {
    const ref = createRef<HTMLLIElement>()
    render(<ListItem ref={ref} headline="H" />)
    expect(ref.current).toBeInstanceOf(HTMLLIElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <List aria-label="Accessible">
        <ListItem headline="Static" supportingText="text" />
        <ListItem headline="Clickable" onClick={() => {}} />
      </List>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
