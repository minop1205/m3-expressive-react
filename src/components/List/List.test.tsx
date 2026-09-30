import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { Checkbox } from '../Checkbox'
import { Switch } from '../Switch'
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
    await user.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(3)
  })

  describe('nested controls in a clickable row (LS5)', () => {
    it('Enter / Space on a trailing button fire only the button', async () => {
      const user = userEvent.setup()
      const onRow = vi.fn()
      const onButton = vi.fn()
      render(
        <ListItem
          headline="Row"
          onClick={onRow}
          trailing={
            <button type="button" onClick={onButton}>
              More
            </button>
          }
        />,
      )
      screen.getByRole('button', { name: 'More' }).focus()
      await user.keyboard('{Enter}')
      await user.keyboard(' ')
      expect(onButton).toHaveBeenCalledTimes(2)
      expect(onRow).not.toHaveBeenCalled()
    })

    it('Space on a trailing Switch toggles it without activating the row', async () => {
      const user = userEvent.setup()
      const onRow = vi.fn()
      render(
        <ListItem
          headline="Wi-Fi"
          onClick={onRow}
          trailing={<Switch aria-label="Wi-Fi toggle" />}
        />,
      )
      const toggle = screen.getByRole('switch', { name: 'Wi-Fi toggle' })
      toggle.focus()
      await user.keyboard(' ')
      expect(toggle).toBeChecked()
      expect(onRow).not.toHaveBeenCalled()
    })

    it('clicking a trailing Switch / Checkbox toggles it without activating the row', async () => {
      const user = userEvent.setup()
      const onRow = vi.fn()
      render(
        <List aria-label="Settings">
          <ListItem
            headline="Wi-Fi"
            onClick={onRow}
            trailing={<Switch aria-label="Wi-Fi toggle" />}
          />
          <ListItem
            headline="Sync"
            onClick={onRow}
            trailing={<Checkbox aria-label="Sync check" />}
          />
        </List>,
      )
      const toggle = screen.getByRole('switch', { name: 'Wi-Fi toggle' })
      const check = screen.getByRole('checkbox', { name: 'Sync check' })
      await user.click(toggle)
      await user.click(check)
      expect(toggle).toBeChecked()
      expect(check).toBeChecked()
      expect(onRow).not.toHaveBeenCalled()
      // The row itself still activates.
      await user.click(screen.getByText('Wi-Fi'))
      expect(onRow).toHaveBeenCalledTimes(1)
    })

    it('typing into a nested input keeps spaces and does not fire the row', async () => {
      const user = userEvent.setup()
      const onRow = vi.fn()
      render(
        <ListItem
          headline="Name"
          onClick={onRow}
          trailing={<input aria-label="Name input" />}
        />,
      )
      const input = screen.getByRole('textbox', { name: 'Name input' })
      await user.type(input, 'a b{Enter}')
      expect(input).toHaveValue('a b')
      expect(onRow).not.toHaveBeenCalled()
    })
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
