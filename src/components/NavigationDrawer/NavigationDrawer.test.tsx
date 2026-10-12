import { createRef, useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { NavigationDrawer, NavigationDrawerItem } from './NavigationDrawer'

const Icon = <svg viewBox="0 0 24 24" aria-hidden="true" />

describe('NavigationDrawer', () => {
  it('renders items and marks the selected one', () => {
    render(
      <NavigationDrawer value="b" onChange={() => {}}>
        <NavigationDrawerItem value="a" icon={Icon} label="Alpha" />
        <NavigationDrawerItem value="b" icon={Icon} label="Beta" />
      </NavigationDrawer>,
    )
    expect(screen.getByRole('button', { name: /Beta/ })).toHaveAttribute('aria-current', 'page')
  })

  it('fires onChange on item click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <NavigationDrawer value="a" onChange={onChange}>
        <NavigationDrawerItem value="b" icon={Icon} label="Beta" />
      </NavigationDrawer>,
    )
    await user.click(screen.getByRole('button', { name: /Beta/ }))
    expect(onChange).toHaveBeenCalledWith(expect.any(Object), 'b')
  })

  it('modal exposes a dialog and closes on Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <NavigationDrawer variant="modal" open onClose={onClose} value="a" onChange={() => {}}>
        <NavigationDrawerItem value="a" icon={Icon} label="Alpha" />
      </NavigationDrawer>,
    )
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLElement>()
    render(
      <NavigationDrawer ref={ref} value="a" onChange={() => {}}>
        <NavigationDrawerItem value="a" icon={Icon} label="A" />
      </NavigationDrawer>,
    )
    expect(ref.current?.tagName).toBe('ASIDE')
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <NavigationDrawer value="a" onChange={() => {}} aria-label="Nav">
        <NavigationDrawerItem value="a" icon={Icon} label="Alpha" />
        <NavigationDrawerItem value="b" icon={Icon} label="Beta" />
      </NavigationDrawer>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

function ModalDrawerHarness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open drawer</button>
      <button>Outside</button>
      <NavigationDrawer
        variant="modal"
        open={open}
        onClose={() => setOpen(false)}
        value="a"
        onChange={() => {}}
        aria-label="Navigation"
      >
        <NavigationDrawerItem value="a" icon={Icon} label="Inbox" />
        <NavigationDrawerItem value="b" icon={Icon} label="Starred" />
      </NavigationDrawer>
    </>
  )
}

describe('NavigationDrawer modal behavior (useModal)', () => {
  it('moves focus in on open and restores it on close', async () => {
    const user = userEvent.setup()
    render(<ModalDrawerHarness />)
    const trigger = screen.getByRole('button', { name: 'Open drawer' })
    await user.click(trigger)
    expect(screen.getByRole('button', { name: 'Inbox' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(trigger).toHaveFocus()
  })

  it('locks scroll and inerts the background while open', async () => {
    const user = userEvent.setup()
    render(<ModalDrawerHarness />)
    const outside = screen.getByRole('button', { name: 'Outside' })
    await user.click(screen.getByRole('button', { name: 'Open drawer' }))
    expect(document.body.style.overflow).toBe('hidden')
    expect(outside.closest('[inert]')).not.toBeNull()
    await user.keyboard('{Escape}')
    expect(outside.closest('[inert]')).toBeNull()
  })
})

describe('NavigationDrawer accessible name', () => {
  it('defaults the modal dialog name to Navigation', () => {
    render(
      <NavigationDrawer variant="modal" open value="a" onChange={() => {}}>
        <NavigationDrawerItem value="a" icon={Icon} label="Inbox" />
      </NavigationDrawer>,
    )
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Navigation')
  })

  it('labels the standard aside landmark by default', () => {
    render(
      <NavigationDrawer value="a" onChange={() => {}}>
        <NavigationDrawerItem value="a" icon={Icon} label="Inbox" />
      </NavigationDrawer>,
    )
    expect(screen.getByRole('complementary')).toHaveAccessibleName('Navigation')
  })

  it('prefers a consumer aria-label', () => {
    render(
      <NavigationDrawer value="a" onChange={() => {}} aria-label="Mail folders">
        <NavigationDrawerItem value="a" icon={Icon} label="Inbox" />
      </NavigationDrawer>,
    )
    expect(screen.getByRole('complementary')).toHaveAccessibleName('Mail folders')
  })
})

describe('NavigationDrawer modal surface element (#429)', () => {
  it('renders the modal dialog as a div, not an aside, and passes axe', async () => {
    const { container } = render(
      <NavigationDrawer variant="modal" open value="a" onChange={() => {}}>
        <NavigationDrawerItem value="a" icon={Icon} label="Inbox" />
      </NavigationDrawer>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog.tagName).toBe('DIV')
    expect(container.querySelector('aside')).toBeNull()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('keeps the standard variant an aside landmark', () => {
    render(
      <NavigationDrawer value="a" onChange={() => {}}>
        <NavigationDrawerItem value="a" icon={Icon} label="Inbox" />
      </NavigationDrawer>,
    )
    expect(screen.getByRole('complementary').tagName).toBe('ASIDE')
  })
})

describe('NavigationDrawer uncontrolled selection (#421)', () => {
  it('selects defaultValue and updates on click, still firing onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <NavigationDrawer defaultValue="a" onChange={onChange}>
        <NavigationDrawerItem value="a" icon={Icon} label="Alpha" />
        <NavigationDrawerItem value="b" icon={Icon} label="Beta" />
      </NavigationDrawer>,
    )
    expect(screen.getByRole('button', { name: /Alpha/ })).toHaveAttribute('aria-current', 'page')
    await user.click(screen.getByRole('button', { name: /Beta/ }))
    expect(onChange).toHaveBeenCalledWith(expect.any(Object), 'b')
    expect(screen.getByRole('button', { name: /Beta/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: /Alpha/ })).not.toHaveAttribute('aria-current')
  })

  it('works with no value at all (nothing selected until clicked)', async () => {
    const user = userEvent.setup()
    render(
      <NavigationDrawer>
        <NavigationDrawerItem value="a" icon={Icon} label="Alpha" />
      </NavigationDrawer>,
    )
    const alpha = screen.getByRole('button', { name: /Alpha/ })
    expect(alpha).not.toHaveAttribute('aria-current')
    await user.click(alpha)
    expect(alpha).toHaveAttribute('aria-current', 'page')
  })

  it('a controlled value wins over clicks', async () => {
    const user = userEvent.setup()
    render(
      <NavigationDrawer value="a" onChange={() => {}}>
        <NavigationDrawerItem value="a" icon={Icon} label="Alpha" />
        <NavigationDrawerItem value="b" icon={Icon} label="Beta" />
      </NavigationDrawer>,
    )
    await user.click(screen.getByRole('button', { name: /Beta/ }))
    expect(screen.getByRole('button', { name: /Alpha/ })).toHaveAttribute('aria-current', 'page')
  })
})

describe('NavigationDrawer onClose reason (#407)', () => {
  it('passes escapeKeyDown and backdropClick', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { container } = render(
      <NavigationDrawer variant="modal" open onClose={onClose}>
        <NavigationDrawerItem value="a" icon={Icon} label="Alpha" />
      </NavigationDrawer>,
    )
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenLastCalledWith(expect.any(KeyboardEvent), 'escapeKeyDown')
    fireEvent.click(container.querySelector('[class*="scrim"]')!)
    expect(onClose).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'click' }),
      'backdropClick',
    )
  })
})
