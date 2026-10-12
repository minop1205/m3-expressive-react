import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { Menu, MenuGroup, MenuItem, type MenuVariant } from './Menu'

const Check = () => <svg data-testid="check" />
const Icon = () => <svg data-testid="icon" />

function SortMenu({
  variant,
  onChange = () => {},
  defaultValue = 'name',
}: {
  variant?: MenuVariant
  onChange?: (value: string | null) => void
  defaultValue?: string | null
}) {
  return (
    <Menu variant={variant} trigger={<button>Open</button>} aria-label="View">
      <MenuGroup
        label="Sort by"
        selectionMode="single"
        defaultValue={defaultValue}
        onChange={(_, v) => onChange(v)}
      >
        <MenuItem value="name" selectedIcon={<Check />}>
          Name
        </MenuItem>
        <MenuItem value="date" selectedIcon={<Check />}>
          Date
        </MenuItem>
      </MenuGroup>
    </Menu>
  )
}

function FilterMenu({ closeOnSelect }: { closeOnSelect?: boolean }) {
  const [value, setValue] = useState<string[]>(['photos'])
  return (
    <>
      <Menu trigger={<button>Open</button>} aria-label="Filters" variant="vertical">
        <MenuGroup
          label="Show"
          selectionMode="multiple"
          value={value}
          onChange={(_, v) => setValue(v)}
          closeOnSelect={closeOnSelect}
        >
          <MenuItem value="photos">Photos</MenuItem>
          <MenuItem value="videos">Videos</MenuItem>
        </MenuGroup>
        <MenuGroup>
          <MenuItem>Reset</MenuItem>
        </MenuGroup>
      </Menu>
      <output>{value.join(',')}</output>
    </>
  )
}

const open = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Open' }))

describe('Menu selection (B33, #435)', () => {
  it('single-select groups expose menuitemradio items', async () => {
    const user = userEvent.setup()
    render(<SortMenu />)
    await open(user)
    expect(screen.getByRole('menuitemradio', { name: 'Name' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByRole('menuitemradio', { name: 'Date' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  it('selecting a radio item calls onChange(event, value) and closes the menu', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SortMenu onChange={onChange} />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await open(user)
    await user.click(screen.getByRole('menuitemradio', { name: 'Date' }))
    expect(onChange).toHaveBeenCalledWith('date')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveFocus()
    await open(user)
    expect(screen.getByRole('menuitemradio', { name: 'Date' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('re-activating the selected radio item does not deselect it', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SortMenu onChange={onChange} />)
    await open(user)
    await user.click(screen.getByRole('menuitemradio', { name: 'Name' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('multi-select groups expose menuitemcheckbox items and stay open', async () => {
    const user = userEvent.setup()
    render(<FilterMenu />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await open(user)
    const videos = screen.getByRole('menuitemcheckbox', { name: 'Videos' })
    await user.click(videos)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(videos).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('photos,videos')
    await user.keyboard('{ArrowUp}{Enter}') // toggles Photos off by keyboard
    expect(screen.getByRole('menuitemcheckbox', { name: 'Photos' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    // A plain item outside the multi-select group still closes the menu.
    await user.click(screen.getByRole('menuitem', { name: 'Reset' }))
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('closeOnSelect overrides the multi-select default', async () => {
    const user = userEvent.setup()
    render(<FilterMenu closeOnSelect />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await open(user)
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Videos' }))
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('an item-level closeOnSelect={false} keeps the menu open', async () => {
    const user = userEvent.setup()
    render(
      <Menu trigger={<button>Open</button>} aria-label="m">
        <MenuItem selected={false} closeOnSelect={false}>
          Wrap lines
        </MenuItem>
      </Menu>,
    )
    const trigger = screen.getByRole('button', { name: 'Open' })
    await open(user)
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Wrap lines' }))
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('selectedIcon replaces startIcon while selected and collapses without one', async () => {
    const user = userEvent.setup()
    render(
      <Menu trigger={<button>Open</button>} aria-label="m">
        <MenuItem selected startIcon={<Icon />} selectedIcon={<Check />}>
          A
        </MenuItem>
        <MenuItem selected={false} startIcon={<Icon />} selectedIcon={<Check />}>
          B
        </MenuItem>
        <MenuItem selected={false} selectedIcon={<Check />}>
          C
        </MenuItem>
      </Menu>,
    )
    await open(user)
    const [a, b, c] = screen.getAllByRole('menuitemcheckbox')
    expect(a.querySelector('[data-testid="check"]')).not.toBeNull()
    expect(a.querySelector('[data-testid="icon"]')).toBeNull()
    expect(b.querySelector('[data-testid="icon"]')).not.toBeNull()
    const slot = c.querySelector('[data-testid="check"]')!.parentElement!
    expect(slot).toHaveAttribute('data-collapsed')
    expect(slot).toHaveAttribute('aria-hidden', 'true')
  })

  it('supportingText describes the item without joining its name', async () => {
    const user = userEvent.setup()
    render(
      <Menu trigger={<button>Open</button>} aria-label="m">
        <MenuItem supportingText="Ctrl+C">Copy</MenuItem>
      </Menu>,
    )
    await open(user)
    const copy = screen.getByRole('menuitem', { name: 'Copy' })
    expect(copy).toHaveAccessibleDescription('Ctrl+C')
    expect(copy).toHaveAttribute('data-supporting-text')
  })

  it('an explicit selected wins over the group value', async () => {
    const user = userEvent.setup()
    render(
      <Menu trigger={<button>Open</button>} aria-label="m">
        <MenuGroup selectionMode="single" defaultValue="a">
          <MenuItem value="a" selected={false}>
            A
          </MenuItem>
        </MenuGroup>
      </Menu>,
    )
    await open(user)
    expect(screen.getByRole('menuitemradio', { name: 'A' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  it('has no axe violations (baseline single-select with supporting text)', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <Menu trigger={<button>Open</button>} aria-label="View">
        <MenuGroup label="Sort by" selectionMode="single" defaultValue="name">
          <MenuItem value="name" selectedIcon={<Check />} supportingText="A to Z">
            Name
          </MenuItem>
          <MenuItem value="date" selectedIcon={<Check />}>
            Date
          </MenuItem>
        </MenuGroup>
      </Menu>,
    )
    await open(user)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations (vertical single- and multi-select)', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <>
        <SortMenu variant="vertical" />
        <FilterMenu />
      </>,
    )
    for (const trigger of screen.getAllByRole('button', { name: 'Open' })) {
      await user.click(trigger)
      expect(await axe(container)).toHaveNoViolations()
    }
  })
})
