import { createRef, useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { Dialog } from './Dialog'

describe('Dialog', () => {
  it('renders a labelled modal dialog when open', () => {
    render(<Dialog open title="Reset?">Body</Dialog>)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('Reset?')
    expect(screen.getByText('Body')).toBeInTheDocument()
  })

  it('renders actions', () => {
    render(<Dialog open title="T" actions={<button>OK</button>} />)
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Dialog open onClose={onClose} title="T">Body</Dialog>)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('renders a full-screen dialog with a close button and header title', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Dialog open fullScreen onClose={onClose} title="Settings" actions={<button>Save</button>}>
        Body content
      </Dialog>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('data-full-screen', 'true')
    expect(dialog).toHaveAccessibleName('Settings')
    expect(screen.getByText('Body content')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('overrides the full-screen close button label with closeLabel', () => {
    render(
      <Dialog open fullScreen title="Settings" closeLabel="閉じる">
        Body
      </Dialog>,
    )
    expect(screen.getByRole('button', { name: '閉じる' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(<Dialog ref={ref} open title="T">x</Dialog>)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <Dialog open title="Accessible" actions={<button>Close</button>}>
        Supporting text
      </Dialog>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

function ModalHarness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open dialog</button>
      <button>Outside</button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Confirm"
        actions={
          <>
            <button>Cancel</button>
            <button>OK</button>
          </>
        }
      >
        <button>Body action</button>
      </Dialog>
    </>
  )
}

describe('Dialog modal behavior (useModal)', () => {
  it('moves focus into the dialog on open', async () => {
    const user = userEvent.setup()
    render(<ModalHarness />)
    await user.click(screen.getByRole('button', { name: 'Open dialog' }))
    expect(screen.getByRole('button', { name: 'Body action' })).toHaveFocus()
  })

  it('wraps Tab and Shift+Tab inside the dialog', async () => {
    const user = userEvent.setup()
    render(<ModalHarness />)
    await user.click(screen.getByRole('button', { name: 'Open dialog' }))
    await user.tab() // Body action -> Cancel
    await user.tab() // -> OK
    expect(screen.getByRole('button', { name: 'OK' })).toHaveFocus()
    await user.tab() // wraps -> Body action
    expect(screen.getByRole('button', { name: 'Body action' })).toHaveFocus()
    await user.tab({ shift: true }) // wraps backwards -> OK
    expect(screen.getByRole('button', { name: 'OK' })).toHaveFocus()
  })

  it('restores focus to the trigger on close', async () => {
    const user = userEvent.setup()
    render(<ModalHarness />)
    const trigger = screen.getByRole('button', { name: 'Open dialog' })
    await user.click(trigger)
    await user.keyboard('{Escape}')
    expect(trigger).toHaveFocus()
  })

  it('locks body scroll while open and unlocks on close', async () => {
    const user = userEvent.setup()
    render(<ModalHarness />)
    await user.click(screen.getByRole('button', { name: 'Open dialog' }))
    expect(document.body.style.overflow).toBe('hidden')
    await user.keyboard('{Escape}')
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('inerts the background while open', async () => {
    const user = userEvent.setup()
    render(<ModalHarness />)
    const outside = screen.getByRole('button', { name: 'Outside' })
    await user.click(screen.getByRole('button', { name: 'Open dialog' }))
    expect(outside.parentElement === document.body || outside.hasAttribute('inert') || outside.closest('[inert]') != null).toBe(true)
    expect(outside.closest('[inert]')).not.toBeNull()
    await user.keyboard('{Escape}')
    expect(outside.closest('[inert]')).toBeNull()
  })
})

describe('Dialog accessible name', () => {
  it('falls back to a generic name without a title', () => {
    render(<Dialog open>Body</Dialog>)
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Dialog')
  })

  it('prefers a consumer aria-label over the fallback', () => {
    render(<Dialog open aria-label="Settings">Body</Dialog>)
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Settings')
  })
})
