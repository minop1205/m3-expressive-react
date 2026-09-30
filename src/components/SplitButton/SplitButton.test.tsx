import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { MenuItem } from '../Menu'
import { SplitButton } from './SplitButton'

const items = (
  <>
    <MenuItem>Save as draft</MenuItem>
    <MenuItem>Schedule</MenuItem>
  </>
)

describe('SplitButton', () => {
  it('renders the leading action and trailing menu button', () => {
    render(<SplitButton menu={items}>Send</SplitButton>)
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'More options' })).toBeInTheDocument()
  })

  it('fires the leading onClick without opening the menu', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <SplitButton menu={items} onClick={onClick}>
        Send
      </SplitButton>,
    )
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(onClick).toHaveBeenCalled()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('opens the menu from the trailing button', async () => {
    const user = userEvent.setup()
    render(<SplitButton menu={items}>Send</SplitButton>)
    const trailing = screen.getByRole('button', { name: 'More options' })
    await user.click(trailing)
    expect(trailing).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menuitem', { name: 'Schedule' })).toBeInTheDocument()
  })

  it('notifies onOpenChange', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <SplitButton menu={items} onOpenChange={onOpenChange}>
        Send
      </SplitButton>,
    )
    await user.click(screen.getByRole('button', { name: 'More options' }))
    expect(onOpenChange).toHaveBeenCalledWith(true)
  })

  it('disables both buttons', () => {
    render(
      <SplitButton menu={items} disabled>
        Send
      </SplitButton>,
    )
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'More options' })).toBeDisabled()
  })

  it('forwards a ref to the leading button', () => {
    const ref = createRef<HTMLButtonElement>()
    render(
      <SplitButton ref={ref} menu={items}>
        Send
      </SplitButton>,
    )
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(<SplitButton menu={items}>Send</SplitButton>)
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('SplitButton uncontrolled open', () => {
  it('renders the menu open with defaultOpen', () => {
    render(<SplitButton defaultOpen menu={<MenuItem>Item</MenuItem>}>Send</SplitButton>)
    expect(screen.getByRole('menuitem', { name: 'Item' })).toBeVisible()
  })
})

describe('SplitButton — Button styling and menu behavior', () => {
  it('styles both halves as Buttons with the variant / size hooks', () => {
    render(
      <SplitButton menu={items} variant="outlined" size="lg">
        Send
      </SplitButton>,
    )
    for (const name of ['Send', 'More options']) {
      const button = screen.getByRole('button', { name })
      expect(button).toHaveAttribute('data-variant', 'outlined')
      expect(button).toHaveAttribute('data-size', 'lg')
    }
  })

  it('marks the root open while the menu is shown', async () => {
    const user = userEvent.setup()
    const { container } = render(<SplitButton menu={items}>Send</SplitButton>)
    const root = container.firstElementChild as HTMLElement
    expect(root).not.toHaveAttribute('data-open')
    await user.click(screen.getByRole('button', { name: 'More options' }))
    expect(root).toHaveAttribute('data-open')
  })

  it('closes on Escape and returns focus to the trailing button', async () => {
    const user = userEvent.setup()
    render(<SplitButton menu={items}>Send</SplitButton>)
    const trailing = screen.getByRole('button', { name: 'More options' })
    trailing.focus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Save as draft' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(trailing).toHaveAttribute('aria-expanded', 'false')
    expect(trailing).toHaveFocus()
  })

  it('closes when an item is chosen', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <SplitButton menu={items} onOpenChange={onOpenChange}>
        Send
      </SplitButton>,
    )
    await user.click(screen.getByRole('button', { name: 'More options' }))
    await user.click(screen.getByRole('menuitem', { name: 'Schedule' }))
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
    expect(screen.getByRole('button', { name: 'More options' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('has no axe violations with the menu open', async () => {
    const { container } = render(
      <SplitButton defaultOpen menu={items}>
        Send
      </SplitButton>,
    )
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations when disabled and outlined', async () => {
    const { container } = render(
      <SplitButton menu={items} variant="outlined" disabled>
        Send
      </SplitButton>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
