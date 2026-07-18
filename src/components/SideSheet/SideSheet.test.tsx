import { createRef, useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { SideSheet } from './SideSheet'

describe('SideSheet', () => {
  it('renders a standard sheet with headline and content', () => {
    render(
      <SideSheet headline="Details">
        <p>Sheet content</p>
      </SideSheet>,
    )
    expect(screen.getByRole('heading', { name: 'Details' })).toBeInTheDocument()
    expect(screen.getByText('Sheet content')).toBeInTheDocument()
  })

  it('renders a modal dialog with aria-modal', () => {
    render(
      <SideSheet variant="modal" open aria-label="Filters">
        <p>Content</p>
      </SideSheet>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Filters' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('closes on close-button click', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <SideSheet headline="X" onClose={onClose}>
        x
      </SideSheet>,
    )
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('closes a modal on Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <SideSheet variant="modal" open onClose={onClose} aria-label="s">
        x
      </SideSheet>,
    )
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('renders a back button and fires onBack', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()
    render(
      <SideSheet variant="modal" open headline="X" showBackButton onBack={onBack} aria-label="s">
        x
      </SideSheet>,
    )
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(onBack).toHaveBeenCalled()
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <SideSheet ref={ref} headline="X">
        x
      </SideSheet>,
    )
    expect(ref.current).toBeInstanceOf(HTMLElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <SideSheet variant="modal" open headline="Options" aria-label="Options">
        <p>Content</p>
      </SideSheet>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

function ModalSheetHarness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open side sheet</button>
      <button>Outside</button>
      <SideSheet
        variant="modal"
        open={open}
        onClose={() => setOpen(false)}
        headline="Filters"
        aria-label="Filters"
      >
        <button>Inside</button>
      </SideSheet>
    </>
  )
}

describe('SideSheet modal behavior (useModal)', () => {
  it('moves focus in on open and restores it on close', async () => {
    const user = userEvent.setup()
    render(<ModalSheetHarness />)
    const trigger = screen.getByRole('button', { name: 'Open side sheet' })
    await user.click(trigger)
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(trigger).toHaveFocus()
  })

  it('locks scroll and inerts the background while open', async () => {
    const user = userEvent.setup()
    render(<ModalSheetHarness />)
    const outside = screen.getByRole('button', { name: 'Outside' })
    await user.click(screen.getByRole('button', { name: 'Open side sheet' }))
    expect(document.body.style.overflow).toBe('hidden')
    expect(outside.closest('[inert]')).not.toBeNull()
    await user.keyboard('{Escape}')
    expect(outside.closest('[inert]')).toBeNull()
  })

  it('does not trap or lock for the standard variant', () => {
    render(
      <SideSheet variant="standard" headline="Details">
        <button>Inside</button>
      </SideSheet>,
    )
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})

describe('SideSheet accessible name', () => {
  it('uses the visible headline as the accessible name', () => {
    render(
      <SideSheet variant="modal" open headline="Filters">
        Body
      </SideSheet>,
    )
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Filters')
  })

  it('falls back to a generic name without a headline', () => {
    render(
      <SideSheet variant="modal" open showCloseButton={false}>
        Body
      </SideSheet>,
    )
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Side sheet')
  })

  it('labels the standard complementary landmark with its headline', () => {
    render(<SideSheet variant="standard" headline="Details">Body</SideSheet>)
    expect(screen.getByRole('complementary')).toHaveAccessibleName('Details')
  })
})
