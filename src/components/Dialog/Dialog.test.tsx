import { createRef, useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
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

describe('Dialog full-screen close button (#423)', () => {
  it('is a standard IconButton (ripple + focus ring) labelled by closeLabel', () => {
    render(
      <Dialog open fullScreen title="Settings" closeLabel="閉じる">
        Body
      </Dialog>,
    )
    const close = screen.getByRole('button', { name: '閉じる' })
    expect(close).toHaveAttribute('data-variant', 'standard')
    expect(close).toHaveAttribute('type', 'button')
    expect(close.querySelector('svg')).not.toBeNull()
  })
})

describe('Dialog onClose reason (#407)', () => {
  it('passes the event and escapeKeyDown / backdropClick', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { container } = render(
      <Dialog open onClose={onClose} title="T">
        Body
      </Dialog>,
    )
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenLastCalledWith(expect.any(KeyboardEvent), 'escapeKeyDown')
    fireEvent.click(container.querySelector('[aria-hidden="true"]') as Element)
    expect(onClose).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'click' }),
      'backdropClick',
    )
  })

  it('passes closeButton from the full-screen close button', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Dialog open fullScreen onClose={onClose} title="T">
        Body
      </Dialog>,
    )
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'click' }), 'closeButton')
  })

  it('still accepts a zero-argument handler (non-breaking)', async () => {
    const user = userEvent.setup()
    let closed = false
    render(
      <Dialog open onClose={() => (closed = true)} title="T">
        Body
      </Dialog>,
    )
    await user.keyboard('{Escape}')
    expect(closed).toBe(true)
  })
})

/*
 * Ruling B46: only the body scrolls (headline / icon / actions pinned), and
 * the basic dialog's width range is a host custom property pair.
 */
describe('Dialog scrolling and width (B46)', () => {
  /** Resolve `var(--name, fallback)` the way the cascade would (jsdom keeps it verbatim). */
  function resolveVar(el: HTMLElement, value: string): string {
    const m = /^var\((--[\w-]+),\s*(.+)\)$/.exec(value.trim())
    if (!m) return value
    for (let node: HTMLElement | null = el; node; node = node.parentElement) {
      const own = node.style.getPropertyValue(m[1]).trim()
      if (own) return own
    }
    return m[2].trim()
  }

  it('makes the body the scroll container and pins the headline, icon and actions', () => {
    render(
      <Dialog open icon={<svg />} title="Terms" actions={<button>Accept</button>}>
        <p>Long body</p>
      </Dialog>,
    )
    const dialog = screen.getByRole('dialog')
    const body = screen.getByText('Long body').parentElement as HTMLElement
    expect(body.parentElement).toBe(dialog)
    const bodyStyle = getComputedStyle(body)
    expect(bodyStyle.overflowY).toBe('auto')
    expect(bodyStyle.minHeight).toBe('0px')
    expect(bodyStyle.flexShrink).toBe('1')
    // The scrollport spans the 24dp side padding; the content box doesn't move.
    expect(bodyStyle.getPropertyValue('margin-inline')).toBe('-24px')
    expect(bodyStyle.getPropertyValue('padding-inline')).toBe('24px')
    const title = screen.getByRole('heading', { name: 'Terms' })
    const actions = screen.getByRole('button', { name: 'Accept' }).parentElement as HTMLElement
    const icon = dialog.firstElementChild as HTMLElement
    for (const pinned of [icon, title, actions]) {
      expect(getComputedStyle(pinned).flexShrink).toBe('0')
      expect(getComputedStyle(pinned).overflowY).toBe('visible')
    }
  })

  it('scrolls only the full-screen body under the fixed top bar', () => {
    render(
      <Dialog open fullScreen title="New event" actions={<button>Save</button>}>
        <p>Long body</p>
      </Dialog>,
    )
    const body = screen.getByText('Long body').parentElement as HTMLElement
    expect(getComputedStyle(body).overflowY).toBe('auto')
    expect(getComputedStyle(body).minHeight).toBe('0px')
    const header = screen.getByRole('heading', { name: 'New event' }).parentElement as HTMLElement
    expect(header.tagName).toBe('HEADER')
    expect(getComputedStyle(header).flexShrink).toBe('0')
  })

  it('defaults the width range to 280–560px', () => {
    render(<Dialog open title="Width" />)
    const dialog = screen.getByRole('dialog')
    const style = getComputedStyle(dialog)
    expect(resolveVar(dialog, style.minWidth)).toBe('280px')
    expect(resolveVar(dialog, style.maxWidth)).toBe('560px')
  })

  it('applies --md-dialog-container-min-width / -max-width from the dialog or an ancestor', () => {
    render(
      <div style={{ ['--md-dialog-container-max-width' as string]: '720px' }}>
        <Dialog
          open
          title="Wide"
          style={{ ['--md-dialog-container-min-width' as string]: '320px' }}
        />
      </div>,
    )
    const dialog = screen.getByRole('dialog')
    const style = getComputedStyle(dialog)
    expect(style.minWidth).toContain('--md-dialog-container-min-width')
    expect(style.maxWidth).toContain('--md-dialog-container-max-width')
    expect(resolveVar(dialog, style.minWidth)).toBe('320px')
    expect(resolveVar(dialog, style.maxWidth)).toBe('720px')
  })

  it('has no axe violations with long scrolling content', async () => {
    const { container } = render(
      <Dialog open title="Terms" actions={<button>Accept</button>}>
        {Array.from({ length: 20 }, (_, i) => (
          <p key={i}>Paragraph {i + 1}</p>
        ))}
      </Dialog>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
