import { createRef } from 'react'
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
