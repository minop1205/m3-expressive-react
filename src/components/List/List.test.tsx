import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { Checkbox } from '../Checkbox'
import { Switch } from '../Switch'
import { List, ListItem } from './List'
import rippleStyles from '../../primitives/Ripple/Ripple.module.css'

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

    it('a press on a trailing control does not ripple the row (#299)', () => {
      const { container } = render(
        <ListItem
          headline="Row"
          onClick={() => {}}
          trailing={<button type="button">More</button>}
        />,
      )
      const ripples = () => container.querySelectorAll(`.${rippleStyles.ripple}`).length
      fireEvent.pointerDown(screen.getByRole('button', { name: 'More' }), { button: 0 })
      expect(ripples()).toBe(0)
      fireEvent.pointerDown(screen.getByText('Row'), { button: 0 })
      expect(ripples()).toBe(1)
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

  it("calls the caller's onKeyDown and lets it suppress activation (#300)", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const onKeyDown = vi.fn((event: { key: string; preventDefault: () => void }) => {
      if (event.key === 'Enter') event.preventDefault()
    })
    render(<ListItem headline="Go" onClick={onClick} onKeyDown={onKeyDown} />)
    screen.getByRole('button', { name: /Go/ }).focus()
    await user.keyboard('{Delete}')
    await user.keyboard('{Enter}')
    expect(onKeyDown).toHaveBeenCalledTimes(2)
    expect(onClick).not.toHaveBeenCalled()
    await user.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(1)
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

  describe('primary action and trailing as siblings (B5, #301)', () => {
    it('renders the primary action as a <button> beside the trailing slot', () => {
      render(
        <List aria-label="Settings">
          <ListItem
            headline="Wi-Fi"
            leading={<svg aria-hidden="true" />}
            onClick={() => {}}
            trailing={<Switch aria-label="Wi-Fi toggle" />}
          />
        </List>,
      )
      const action = screen.getByRole('button', { name: 'Wi-Fi' })
      const toggle = screen.getByRole('switch', { name: 'Wi-Fi toggle' })
      expect(action.tagName).toBe('BUTTON')
      expect(action).toHaveAttribute('type', 'button')
      expect(action.contains(toggle)).toBe(false)
      // Same row, same listitem.
      expect(action.closest('li')).toBe(toggle.closest('li'))
    })

    it('renders an <a href> primary action for href', async () => {
      render(
        <List aria-label="Links">
          <ListItem headline="Docs" href="/docs" target="_blank" rel="noopener" />
        </List>,
      )
      const link = screen.getByRole('link', { name: 'Docs' })
      expect(link).toHaveAttribute('href', '/docs')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener')
    })

    it('puts role, tabIndex and aria-* on the primary action, other props on the <li>', () => {
      render(
        <ListItem
          headline="Row"
          onClick={() => {}}
          aria-label="Open row"
          role="menuitem"
          tabIndex={-1}
          id="row-1"
          data-testid="root"
        />,
      )
      const action = screen.getByRole('menuitem', { name: 'Open row' })
      expect(action).toHaveAttribute('tabindex', '-1')
      const root = screen.getByTestId('root')
      expect(root.tagName).toBe('LI')
      expect(root).toHaveAttribute('id', 'row-1')
      expect(root).not.toHaveAttribute('aria-label')
    })

    it('a disabled actionable row renders a disabled button', () => {
      render(<ListItem headline="Off" onClick={() => {}} disabled />)
      expect(screen.getByRole('button', { name: 'Off' })).toBeDisabled()
    })

    it('has no axe violations with trailing controls (no nested-interactive)', async () => {
      const { container } = render(
        <List aria-label="Settings">
          <ListItem
            headline="Wi-Fi"
            onClick={() => {}}
            trailing={<Switch aria-label="Wi-Fi toggle" />}
          />
          <ListItem
            headline="Sync"
            href="/sync"
            trailing={<Checkbox aria-label="Sync check" />}
          />
        </List>,
      )
      expect(await axe(container)).toHaveNoViolations()
    })
  })

  describe('leading slot (#227)', () => {
    it('is not hidden from assistive technology', async () => {
      const { container } = render(
        <List aria-label="Pick">
          <ListItem headline="Ada" leading={<img src="data:," alt="Ada avatar" />} />
          <ListItem headline="Agree" leading={<Checkbox aria-label="Agree" />} />
        </List>,
      )
      expect(screen.getByRole('img', { name: 'Ada avatar' })).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: 'Agree' })).toBeInTheDocument()
      expect(container.querySelector('[aria-hidden="true"] input')).toBeNull()
      expect(await axe(container)).toHaveNoViolations()
    })
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
