import { createRef, useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { BottomSheet } from './BottomSheet'

describe('BottomSheet', () => {
  it('renders a modal dialog with its content', () => {
    render(
      <BottomSheet open aria-label="Actions">
        <p>Sheet content</p>
      </BottomSheet>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Actions' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText('Sheet content')).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose} aria-label="s">
        x
      </BottomSheet>,
    )
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('can hide the drag handle', () => {
    const { container, rerender } = render(
      <BottomSheet open aria-label="s" showDragHandle>
        x
      </BottomSheet>,
    )
    expect(container.querySelector('[class*="dragHandle"]')).toBeInTheDocument()
    rerender(
      <BottomSheet open aria-label="s" showDragHandle={false}>
        x
      </BottomSheet>,
    )
    expect(container.querySelector('[class*="dragHandle"]')).not.toBeInTheDocument()
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <BottomSheet ref={ref} open aria-label="s">
        x
      </BottomSheet>,
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <BottomSheet open aria-label="Options">
        <p>Content</p>
      </BottomSheet>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

function SheetHarness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open sheet</button>
      <button>Outside</button>
      <BottomSheet open={open} onClose={() => setOpen(false)} aria-label="Options">
        <button>First</button>
        <button>Last</button>
      </BottomSheet>
    </>
  )
}

describe('BottomSheet modal behavior (useModal)', () => {
  it('moves focus in on open and restores it on close', async () => {
    const user = userEvent.setup()
    render(<SheetHarness />)
    const trigger = screen.getByRole('button', { name: 'Open sheet' })
    await user.click(trigger)
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(trigger).toHaveFocus()
  })

  it('wraps Tab inside the sheet', async () => {
    const user = userEvent.setup()
    render(<SheetHarness />)
    await user.click(screen.getByRole('button', { name: 'Open sheet' }))
    await user.tab() // First -> Last
    await user.tab() // wraps -> First
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()
  })

  it('locks scroll and inerts the background while open', async () => {
    const user = userEvent.setup()
    render(<SheetHarness />)
    const outside = screen.getByRole('button', { name: 'Outside' })
    await user.click(screen.getByRole('button', { name: 'Open sheet' }))
    expect(document.body.style.overflow).toBe('hidden')
    expect(outside.closest('[inert]')).not.toBeNull()
    await user.keyboard('{Escape}')
    expect(document.body.style.overflow).not.toBe('hidden')
    expect(outside.closest('[inert]')).toBeNull()
  })
})
