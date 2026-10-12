import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { IconButton } from '../IconButton'
import { Tooltip } from '../Tooltip'
import { Menu, MenuItem } from './Menu'

// Menu ⇄ Tooltip composition (#419): props must land on the real button.

const Icon = () => <svg viewBox="0 0 24 24" />

function setupFake() {
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['setTimeout', 'clearTimeout'] })
  return userEvent.setup({ delay: null })
}

afterEach(() => {
  vi.useRealTimers()
})

function MenuWithTooltipTrigger({ onSelect = () => {} }: { onSelect?: () => void }) {
  return (
    <Menu
      aria-label="More options"
      trigger={
        <Tooltip text="More">
          <IconButton icon={<Icon />} aria-label="More" variant="standard" />
        </Tooltip>
      }
    >
      <MenuItem onClick={onSelect}>Copy</MenuItem>
      <MenuItem>Share</MenuItem>
    </Menu>
  )
}

function TooltipAroundMenu() {
  return (
    <Tooltip text="More">
      <Menu
        aria-label="More options"
        trigger={<IconButton icon={<Icon />} aria-label="More" variant="standard" />}
      >
        <MenuItem>Copy</MenuItem>
        <MenuItem>Share</MenuItem>
      </Menu>
    </Tooltip>
  )
}

describe('Menu trigger wrapped in a Tooltip', () => {
  it('puts the menu-button ARIA on the real button', async () => {
    const user = userEvent.setup()
    render(<MenuWithTooltipTrigger />)
    const button = screen.getByRole('button', { name: 'More' })
    expect(button).toHaveAttribute('aria-haspopup', 'menu')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    const menu = screen.getByRole('menu', { hidden: true })
    expect(button).toHaveAttribute('aria-controls', menu.id)
    // The Tooltip wrapper carries none of it.
    const wrapper = button.parentElement!
    expect(wrapper).not.toHaveAttribute('aria-haspopup')
    expect(wrapper).not.toHaveAttribute('aria-expanded')

    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menuitem', { name: 'Copy' })).toHaveFocus()
  })

  it('returns focus to the button after Escape', async () => {
    const user = userEvent.setup()
    render(<MenuWithTooltipTrigger />)
    const button = screen.getByRole('button', { name: 'More' })
    await user.click(button)
    expect(screen.getByRole('menuitem', { name: 'Copy' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveFocus()
  })

  it('returns focus to the button after a selection', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<MenuWithTooltipTrigger onSelect={onSelect} />)
    const button = screen.getByRole('button', { name: 'More' })
    await user.click(button)
    await user.click(screen.getByRole('menuitem', { name: 'Copy' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveFocus()
  })

  it('opens with ArrowDown on the button', async () => {
    const user = userEvent.setup()
    render(<MenuWithTooltipTrigger />)
    const button = screen.getByRole('button', { name: 'More' })
    act(() => button.focus())
    await user.keyboard('{ArrowDown}')
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })

  it('still shows the tooltip on hover, described on the button', async () => {
    const user = setupFake()
    render(<MenuWithTooltipTrigger />)
    const button = screen.getByRole('button', { name: 'More' })
    await user.hover(button)
    const tip = screen.getByRole('tooltip')
    expect(button.getAttribute('aria-describedby')).toBe(tip.id)
  })

  it('hides the tooltip while the menu is open', async () => {
    const user = setupFake()
    render(<MenuWithTooltipTrigger />)
    const button = screen.getByRole('button', { name: 'More' })
    await user.hover(button)
    expect(button).toHaveAttribute('aria-describedby')
    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button).not.toHaveAttribute('aria-describedby')
  })

  it('has no axe violations (closed and open)', async () => {
    const user = userEvent.setup()
    const { container } = render(<MenuWithTooltipTrigger />)
    expect(await axe(container)).toHaveNoViolations()
    await user.click(screen.getByRole('button', { name: 'More' }))
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('Tooltip wrapping a Menu', () => {
  it('opens on hover of the trigger button and sets aria-describedby on it', async () => {
    const user = setupFake()
    render(<TooltipAroundMenu />)
    const button = screen.getByRole('button', { name: 'More' })
    expect(button).not.toHaveAttribute('aria-describedby')
    await user.hover(button)
    const tip = screen.getByRole('tooltip')
    expect(button).toHaveAttribute('aria-describedby', tip.id)
    // Not on the menu popup.
    expect(screen.getByRole('menu', { hidden: true })).not.toHaveAttribute('aria-describedby')
  })

  it('opens on keyboard focus of the trigger button', async () => {
    const user = setupFake()
    render(<TooltipAroundMenu />)
    await user.tab()
    const button = screen.getByRole('button', { name: 'More' })
    expect(button).toHaveFocus()
    expect(button).toHaveAttribute('aria-describedby', screen.getByRole('tooltip').id)
  })

  it('keeps the menu-button behavior and focus return', async () => {
    const user = setupFake()
    render(<TooltipAroundMenu />)
    const button = screen.getByRole('button', { name: 'More' })
    expect(button).toHaveAttribute('aria-haspopup', 'menu')
    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menuitem', { name: 'Copy' })).toHaveFocus()
    // Focus inside the menu hides the tooltip so it doesn't cover the menu.
    expect(button).not.toHaveAttribute('aria-describedby')
    await user.keyboard('{Escape}')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveFocus()
  })

  it('has no axe violations (tooltip shown, then menu open)', async () => {
    const user = userEvent.setup()
    const { container } = render(<TooltipAroundMenu />)
    await user.hover(screen.getByRole('button', { name: 'More' }))
    expect(await axe(container)).toHaveNoViolations()
    await user.click(screen.getByRole('button', { name: 'More' }))
    expect(await axe(container)).toHaveNoViolations()
  })
})
