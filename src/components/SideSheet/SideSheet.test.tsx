import { createRef } from 'react'
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
