import { createRef, useState } from 'react'
import { render, screen } from '@testing-library/react'
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
    expect(onChange).toHaveBeenCalledWith('b')
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
