import type { KeyboardEvent } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { Menu, MenuDivider, MenuGroup, MenuItem } from './Menu'

function Example({
  onSelect = () => {},
  onArchive = () => {},
}: {
  onSelect?: () => void
  onArchive?: () => void
}) {
  return (
    <>
      <Menu trigger={<button>Open</button>} aria-label="Actions">
        <MenuItem onClick={onSelect}>Copy</MenuItem>
        <MenuItem>Share</MenuItem>
        <MenuItem disabled onClick={onArchive}>
          Archive
        </MenuItem>
      </Menu>
      <button>After</button>
    </>
  )
}

const item = (name: string) => screen.getByRole('menuitem', { name })

describe('Menu', () => {
  it('toggles open from the trigger and sets aria-expanded', async () => {
    const user = userEvent.setup()
    render(<Example />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(item('Copy')).toBeVisible()
  })

  it('selects an item, closes, and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<Example onSelect={onSelect} />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)
    await user.click(item('Copy'))
    expect(onSelect).toHaveBeenCalled()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveFocus()
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    render(<Example />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)
    await user.keyboard('{Escape}')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveFocus()
  })

  it('focuses the first item when opened (click / Enter / ArrowDown)', async () => {
    const user = userEvent.setup()
    render(<Example />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(item('Copy')).toHaveFocus()
  })

  it('opens focusing the last item on ArrowUp', async () => {
    const user = userEvent.setup()
    render(<Example />)
    screen.getByRole('button', { name: 'Open' }).focus()
    await user.keyboard('{ArrowUp}')
    expect(item('Archive')).toHaveFocus()
  })

  it('moves focus with ArrowDown/ArrowUp and wraps', async () => {
    const user = userEvent.setup()
    render(<Example />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await user.keyboard('{ArrowDown}')
    expect(item('Share')).toHaveFocus()
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(item('Copy')).toHaveFocus() // wrapped past Archive
    await user.keyboard('{ArrowUp}')
    expect(item('Archive')).toHaveFocus() // wraps backwards
  })

  it('jumps with Home and End', async () => {
    const user = userEvent.setup()
    render(<Example />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await user.keyboard('{End}')
    expect(item('Archive')).toHaveFocus()
    await user.keyboard('{Home}')
    expect(item('Copy')).toHaveFocus()
  })

  it('moves focus by typeahead', async () => {
    // Advance the clock past the buffer-reset window on every read so each
    // keypress counts as a fresh single-character search.
    let clock = 0
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => (clock += 1000))
    const user = userEvent.setup()
    render(<Example />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await user.keyboard('s')
    expect(item('Share')).toHaveFocus()
    await user.keyboard('a')
    expect(item('Archive')).toHaveFocus()
    nowSpy.mockRestore()
  })

  it('accumulates a typeahead buffer for rapid keys', async () => {
    const user = userEvent.setup()
    render(<Example />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await user.keyboard('sh')
    expect(item('Share')).toHaveFocus()
  })

  it('closes on Tab and does not trap focus', async () => {
    const user = userEvent.setup()
    render(<Example />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)
    await user.tab()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps items out of the page Tab order (roving tabindex)', async () => {
    const user = userEvent.setup()
    render(<Example />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    for (const name of ['Copy', 'Share', 'Archive']) {
      expect(item(name)).toHaveAttribute('tabindex', '-1')
    }
  })

  it('disabled items are focusable but inert', async () => {
    const user = userEvent.setup()
    const onArchive = vi.fn()
    render(<Example onArchive={onArchive} />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)
    await user.keyboard('{ArrowUp}') // wraps to last item = Archive
    const archive = item('Archive')
    expect(archive).toHaveFocus()
    expect(archive).toHaveAttribute('aria-disabled', 'true')
    await user.keyboard('{Enter}')
    expect(onArchive).not.toHaveBeenCalled()
    expect(trigger).toHaveAttribute('aria-expanded', 'true') // still open
  })

  it('opens below by default', async () => {
    const user = userEvent.setup()
    render(<Example />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByRole('menu')).toHaveAttribute('data-placement', 'below')
  })

  it('flips above the trigger when there is no space below', async () => {
    const user = userEvent.setup()
    render(<Example />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    const wrapper = trigger.parentElement as HTMLElement
    // Anchor near the viewport bottom (jsdom window.innerHeight = 768).
    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue({
      top: 700,
      bottom: 730,
      left: 0,
      right: 100,
      width: 100,
      height: 30,
      x: 0,
      y: 700,
      toJSON: () => ({}),
    } as DOMRect)
    const menu = screen.getByRole('menu', { hidden: true })
    Object.defineProperty(menu, 'offsetHeight', { value: 200, configurable: true })
    await user.click(trigger)
    expect(menu).toHaveAttribute('data-placement', 'above')
  })

  it('has no axe violations when open', async () => {
    const user = userEvent.setup()
    const { container } = render(<Example />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(await axe(container)).toHaveNoViolations()
  })
})

function VerticalExample({
  color,
  onBold = () => {},
}: {
  color?: 'standard' | 'vibrant'
  onBold?: () => void
}) {
  return (
    <Menu variant="vertical" color={color} trigger={<button>Open</button>} aria-label="Edit">
      <MenuGroup label="Format">
        <MenuItem selected onClick={onBold}>
          Bold
        </MenuItem>
        <MenuItem selected={false}>Italic</MenuItem>
      </MenuGroup>
      <MenuGroup>
        <MenuItem>Copy</MenuItem>
        <MenuDivider />
        <MenuItem disabled>Archive</MenuItem>
      </MenuGroup>
    </Menu>
  )
}

describe('Menu (vertical variant)', () => {
  it('sets data-variant and data-color on the popup', async () => {
    const user = userEvent.setup()
    render(<VerticalExample color="vibrant" />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    const menu = screen.getByRole('menu')
    expect(menu).toHaveAttribute('data-variant', 'vertical')
    expect(menu).toHaveAttribute('data-color', 'vibrant')
  })

  it('defaults to the standard variant and color', async () => {
    const user = userEvent.setup()
    render(<Example />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    const menu = screen.getByRole('menu')
    expect(menu).toHaveAttribute('data-variant', 'standard')
    expect(menu).toHaveAttribute('data-color', 'standard')
  })

  it('renders groups with an accessible label', async () => {
    const user = userEvent.setup()
    render(<VerticalExample />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    const groups = screen.getAllByRole('group')
    expect(groups).toHaveLength(2)
    expect(groups[0]).toHaveAccessibleName('Format')
    expect(groups[1]).not.toHaveAttribute('aria-labelledby')
  })

  it('renders a divider as a separator', async () => {
    const user = userEvent.setup()
    render(<VerticalExample />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByRole('separator')).toBeInTheDocument()
  })

  it('exposes selection via role="menuitemcheckbox" and aria-checked', async () => {
    const user = userEvent.setup()
    render(<VerticalExample />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByRole('menuitemcheckbox', { name: 'Bold' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByRole('menuitemcheckbox', { name: 'Italic' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    // Items without a `selected` prop stay plain menuitems.
    expect(screen.getByRole('menuitem', { name: 'Copy' })).toBeInTheDocument()
  })

  it('activates a checkbox item and closes the menu', async () => {
    const user = userEvent.setup()
    const onBold = vi.fn()
    render(<VerticalExample onBold={onBold} />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Bold' }))
    expect(onBold).toHaveBeenCalled()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('keyboard navigation traverses items across groups and skips labels/dividers', async () => {
    const user = userEvent.setup()
    render(<VerticalExample />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByRole('menuitemcheckbox', { name: 'Bold' })).toHaveFocus()
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Copy' })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Archive' })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitemcheckbox', { name: 'Bold' })).toHaveFocus() // wraps
    await user.keyboard('{End}')
    expect(screen.getByRole('menuitem', { name: 'Archive' })).toHaveFocus()
  })

  it('has no axe violations when open', async () => {
    const user = userEvent.setup()
    const { container } = render(<VerticalExample />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations with the vibrant color option', async () => {
    const user = userEvent.setup()
    const { container } = render(<VerticalExample color="vibrant" />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('Menu behavior (#430)', () => {
  function Fruits(props: { onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void }) {
    return (
      <Menu trigger={<button>Open</button>} aria-label="Fruits" {...props}>
        <MenuItem>Apple</MenuItem>
        <MenuItem>Avocado</MenuItem>
        <MenuItem>Apricot</MenuItem>
        <MenuItem>Banana</MenuItem>
      </Menu>
    )
  }

  it('cycles through matches when the same letter is typed repeatedly', async () => {
    // A frozen clock keeps every keypress inside the typeahead window.
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    try {
      const user = userEvent.setup()
      render(<Fruits />)
      await user.click(screen.getByRole('button', { name: 'Open' }))
      expect(item('Apple')).toHaveFocus()
      await user.keyboard('a')
      expect(item('Avocado')).toHaveFocus()
      await user.keyboard('a')
      expect(item('Apricot')).toHaveFocus()
      await user.keyboard('a')
      expect(item('Apple')).toHaveFocus()
    } finally {
      nowSpy.mockRestore()
    }
  })

  it('respects a consumer onKeyDown that calls preventDefault()', async () => {
    const user = userEvent.setup()
    render(<Fruits onKeyDown={(e) => e.preventDefault()} />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(item('Apple')).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(item('Apple')).toHaveFocus()
    await user.keyboard('b')
    expect(item('Apple')).toHaveFocus()
  })

  it('closes on an outside pointerdown', async () => {
    const user = userEvent.setup()
    render(<Fruits />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    fireEvent.pointerDown(document.body)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('Menu focus and ARIA (#420)', () => {
  it('typeahead matches the label, not icon ligature text', async () => {
    const user = userEvent.setup()
    render(
      <Menu trigger={<button>Open</button>} aria-label="Edit">
        <MenuItem>Copy</MenuItem>
        {/* Material Symbols render the "delete" ligature as an icon. */}
        <MenuItem startIcon={<span className="material-symbols-outlined">delete</span>}>
          Remove
        </MenuItem>
        <MenuItem>Duplicate</MenuItem>
      </Menu>,
    )
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await user.keyboard('d')
    expect(item('Duplicate')).toHaveFocus()
  })

  it('uses the latest onOpenChange in its document listeners', async () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = render(
      <Menu trigger={<button>Open</button>} aria-label="m" open onOpenChange={first}>
        <MenuItem>Copy</MenuItem>
      </Menu>,
    )
    rerender(
      <Menu trigger={<button>Open</button>} aria-label="m" open onOpenChange={second}>
        <MenuItem>Copy</MenuItem>
      </Menu>,
    )
    fireEvent.pointerDown(document.body)
    expect(second).toHaveBeenCalledWith(false)
    expect(first).not.toHaveBeenCalled()
  })

  it('links the trigger and the menu (aria-controls / aria-labelledby)', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <Menu trigger={<button>Actions</button>}>
        <MenuItem>Copy</MenuItem>
      </Menu>,
    )
    const trigger = screen.getByRole('button', { name: 'Actions' })
    await user.click(trigger)
    const menu = screen.getByRole('menu', { name: 'Actions' })
    expect(trigger).toHaveAttribute('aria-controls', menu.id)
    expect(menu).toHaveAttribute('aria-labelledby', trigger.id)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('keeps consumer ids and an explicit aria-label', async () => {
    const user = userEvent.setup()
    render(
      <Menu trigger={<button id="my-trigger">Open</button>} id="my-menu" aria-label="Named">
        <MenuItem>Copy</MenuItem>
      </Menu>,
    )
    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)
    const menu = screen.getByRole('menu', { name: 'Named' })
    expect(menu.id).toBe('my-menu')
    expect(trigger).toHaveAttribute('aria-controls', 'my-menu')
    expect(menu).not.toHaveAttribute('aria-labelledby')
  })

  it('closes when focus moves out of it programmatically', async () => {
    const user = userEvent.setup()
    render(<Example />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)
    expect(item('Copy')).toHaveFocus()
    act(() => screen.getByRole('button', { name: 'After' }).focus())
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})
