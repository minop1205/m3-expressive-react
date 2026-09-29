import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { FabMenu, FabMenuItem } from './FabMenu'

const add = <span aria-hidden="true">＋</span>

function Example(props: Partial<React.ComponentProps<typeof FabMenu>> = {}) {
  return (
    <FabMenu icon={add} ariaLabel="Create" {...props}>
      <FabMenuItem icon={<span aria-hidden="true">✎</span>}>Note</FabMenuItem>
      <FabMenuItem icon={<span aria-hidden="true">⏰</span>}>Reminder</FabMenuItem>
    </FabMenu>
  )
}

describe('FabMenu', () => {
  it('renders a collapsed FAB', () => {
    render(<Example />)
    const fab = screen.getByRole('button', { name: 'Create' })
    expect(fab).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens on click and shows the items', async () => {
    const user = userEvent.setup()
    render(<Example />)
    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menuitem', { name: 'Note' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Reminder' })).toBeInTheDocument()
  })

  it('fires an item onClick and closes the menu', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <FabMenu icon={add} ariaLabel="Create" onOpenChange={onOpenChange} defaultOpen>
        <FabMenuItem onClick={onClick}>Note</FabMenuItem>
      </FabMenu>,
    )
    await user.click(screen.getByRole('menuitem', { name: 'Note' }))
    expect(onClick).toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<Example defaultOpen onOpenChange={onOpenChange} />)
    await user.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <FabMenu ref={ref} icon={add} ariaLabel="Create">
        <FabMenuItem>Note</FabMenuItem>
      </FabMenu>,
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('has no axe violations (open)', async () => {
    const { container } = render(<Example defaultOpen />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
