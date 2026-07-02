import { createRef } from 'react'
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
