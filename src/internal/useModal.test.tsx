import { useRef, useState, type ReactNode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { Dialog } from '../components/Dialog'
import { Menu, MenuItem } from '../components/Menu'
import { SnackbarProvider, useSnackbar, type UseSnackbarResult } from '../components/Snackbar'
import { getTabbable, useModal } from './useModal'

const isInert = (el: Element) => el.closest('[inert]') != null

/** Minimal modal built directly on the hook. */
function Modal({
  open,
  onEscape,
  label,
  children,
}: {
  open: boolean
  onEscape?: () => void
  label: string
  children?: ReactNode
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  useModal({ active: open, rootRef, surfaceRef, onEscape })
  return (
    <div ref={rootRef} data-open={open || undefined}>
      <div ref={surfaceRef} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>
        {children}
      </div>
    </div>
  )
}

describe('useModal — modal stack', () => {
  it('a sibling modal opened from another one is interactive (B opened from A)', async () => {
    const user = userEvent.setup()
    function App() {
      const [a, setA] = useState(true)
      const [b, setB] = useState(false)
      return (
        <>
          <button>Outside</button>
          <Dialog open={a} onClose={() => setA(false)} title="A">
            <button onClick={() => setB(true)}>Open B</button>
          </Dialog>
          <Dialog open={b} onClose={() => setB(false)} title="B">
            <button>Inside B</button>
          </Dialog>
        </>
      )
    }
    render(<App />)
    const openB = screen.getByRole('button', { name: 'Open B' })
    expect(openB).toHaveFocus()
    await user.click(openB)

    const insideB = screen.getByRole('button', { name: 'Inside B' })
    expect(isInert(insideB)).toBe(false)
    expect(insideB).toHaveFocus()
    expect(isInert(openB)).toBe(true)
    expect(isInert(screen.getByRole('button', { name: 'Outside' }))).toBe(true)

    // Only B's Tab wrap runs: focus stays on B's only stop.
    await user.tab()
    expect(insideB).toHaveFocus()

    // Closing B makes A interactive again and returns focus into A.
    await user.keyboard('{Escape}')
    expect(isInert(openB)).toBe(false)
    expect(openB).toHaveFocus()
    expect(isInert(screen.getByRole('button', { name: 'Outside' }))).toBe(true)
  })

  it('a nested modal (rendered inside another) owns inert and focus', async () => {
    const user = userEvent.setup()
    function App() {
      const [b, setB] = useState(false)
      return (
        <>
          <button>Outside</button>
          <Dialog open title="A">
            <button onClick={() => setB(true)}>Open B</button>
            <button>Other A</button>
            <Dialog open={b} onClose={() => setB(false)} title="B">
              <button>Inside B</button>
            </Dialog>
          </Dialog>
        </>
      )
    }
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Open B' }))
    expect(isInert(screen.getByRole('button', { name: 'Inside B' }))).toBe(false)
    expect(isInert(screen.getByRole('button', { name: 'Other A' }))).toBe(true)
    expect(isInert(screen.getByRole('button', { name: 'Outside' }))).toBe(true)
    await user.keyboard('{Escape}')
    expect(isInert(screen.getByRole('button', { name: 'Other A' }))).toBe(false)
    expect(isInert(screen.getByRole('button', { name: 'Outside' }))).toBe(true)
    expect(screen.getByRole('button', { name: 'Open B' })).toHaveFocus()
  })

  it('restores inert correctly when modals close out of order', () => {
    function App({ a, b }: { a: boolean; b: boolean }) {
      return (
        <>
          <button>Outside</button>
          <Modal open={a} label="A">
            <button>In A</button>
          </Modal>
          <Modal open={b} label="B">
            <button>In B</button>
          </Modal>
        </>
      )
    }
    const { rerender } = render(<App a={false} b={false} />)
    const outside = screen.getByRole('button', { name: 'Outside' })
    rerender(<App a b={false} />)
    rerender(<App a b />)
    expect(isInert(outside)).toBe(true)

    // A closes first while B stays open: the page must stay inert under B.
    rerender(<App a={false} b />)
    expect(isInert(outside)).toBe(true)
    expect(isInert(screen.getByRole('button', { name: 'In B' }))).toBe(false)

    rerender(<App a={false} b={false} />)
    expect(document.querySelectorAll('[inert]')).toHaveLength(0)
    expect(document.body.style.overflow).toBe('')
  })

  it('Escape closes only the topmost modal', async () => {
    const user = userEvent.setup()
    const closeA = vi.fn()
    const closeB = vi.fn()
    render(
      <>
        <Dialog open onClose={closeA} title="A">
          A
        </Dialog>
        <Dialog open onClose={closeB} title="B">
          B
        </Dialog>
      </>,
    )
    await user.keyboard('{Escape}')
    expect(closeB).toHaveBeenCalledTimes(1)
    expect(closeA).not.toHaveBeenCalled()
  })

  it('ignores an Escape that was already defaultPrevented', () => {
    const onEscape = vi.fn()
    render(
      <Modal open onEscape={onEscape} label="M">
        <input aria-label="field" onKeyDown={(event) => event.preventDefault()} />
      </Modal>,
    )
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' })
    expect(onEscape).not.toHaveBeenCalled()
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(onEscape).toHaveBeenCalledTimes(1)
  })

  it('Escape in a Menu inside a Dialog closes only the Menu', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose} title="T">
        <Menu trigger={<button>Options</button>}>
          <MenuItem>Copy</MenuItem>
        </Menu>
      </Dialog>,
    )
    const trigger = screen.getByRole('button', { name: 'Options' })
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Escape}')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(onClose).not.toHaveBeenCalled()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps a Snackbar action usable and announced under a Dialog', async () => {
    let api!: UseSnackbarResult
    function Grab() {
      api = useSnackbar()
      return null
    }
    const { container } = render(
      <SnackbarProvider>
        <Grab />
        <Dialog open title="T">
          Body
        </Dialog>
      </SnackbarProvider>,
    )
    act(() => {
      void api.show({ message: 'Deleted', actionLabel: 'Undo' })
    })
    const undo = screen.getByRole('button', { name: 'Undo' })
    expect(isInert(undo)).toBe(false)
    expect(isInert(screen.getByRole('status'))).toBe(false)
    expect(screen.getByRole('status')).toHaveTextContent('Deleted')
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('useModal — Tab wrap', () => {
  it('getTabbable skips tabindex=-1, hidden, inert and non-checked radios', () => {
    render(
      <div data-testid="surface">
        <button>First</button>
        <button tabIndex={-1}>Roving</button>
        <button hidden>Hidden</button>
        <button style={{ display: 'none' }}>None</button>
        <span style={{ visibility: 'hidden' }}>
          <button>Invisible</button>
        </span>
        <div inert>
          <button>Inert</button>
        </div>
        <input type="hidden" />
        <input type="radio" name="g" aria-label="r1" />
        <input type="radio" name="g" aria-label="r2" defaultChecked />
        <input type="radio" name="g" aria-label="r3" />
        <input type="radio" name="h" aria-label="h1" />
        <input type="radio" name="h" aria-label="h2" />
        <div tabIndex={0}>Div</div>
      </div>,
    )
    const names = getTabbable(screen.getByTestId('surface')).map(
      (el) => el.getAttribute('aria-label') ?? el.textContent,
    )
    expect(names).toEqual(['First', 'r2', 'h1', 'Div'])
  })

  it('wraps Tab when the last focusable element is not a Tab stop', async () => {
    const user = userEvent.setup()
    render(
      <>
        <button>Outside</button>
        <Modal open label="M">
          <button>One</button>
          <button>Two</button>
          <button tabIndex={-1}>Roving</button>
        </Modal>
      </>,
    )
    const one = screen.getByRole('button', { name: 'One' })
    expect(one).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Two' })).toHaveFocus()
    await user.tab()
    expect(one).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Two' })).toHaveFocus()
  })

  it('wraps Tab from the checked radio of a trailing group', async () => {
    const user = userEvent.setup()
    render(
      <Modal open label="M">
        <button>Start</button>
        <input type="radio" name="g" aria-label="r1" />
        <input type="radio" name="g" aria-label="r2" defaultChecked />
        <input type="radio" name="g" aria-label="r3" />
      </Modal>,
    )
    screen.getByRole('radio', { name: 'r2' }).focus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Start' })).toHaveFocus()
  })
})

describe('useModal — focus return', () => {
  it('returns focus to the trigger on close', async () => {
    const user = userEvent.setup()
    function App() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          <Dialog open={open} onClose={() => setOpen(false)} title="T">
            <button>Inside</button>
          </Dialog>
        </>
      )
    }
    render(<App />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)
    expect(screen.getByRole('button', { name: 'Inside' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(trigger).toHaveFocus()
  })

  it('falls back to the nearest surviving ancestor when the trigger was removed', () => {
    function App({ open, showTrigger }: { open: boolean; showTrigger: boolean }) {
      return (
        <>
          <section>
            <button>Sibling</button>
            {showTrigger && <button>Trigger</button>}
          </section>
          <Modal open={open} label="M">
            <button>Inside</button>
          </Modal>
        </>
      )
    }
    const { rerender } = render(<App open={false} showTrigger />)
    screen.getByRole('button', { name: 'Trigger' }).focus()
    rerender(<App open showTrigger />)
    expect(screen.getByRole('button', { name: 'Inside' })).toHaveFocus()
    rerender(<App open showTrigger={false} />)
    rerender(<App open={false} showTrigger={false} />)
    expect(screen.getByRole('button', { name: 'Sibling' })).toHaveFocus()
  })

  it('never leaves focus inside the closed surface when nothing survives', () => {
    function App({ open, showTrigger }: { open: boolean; showTrigger: boolean }) {
      return (
        <>
          {showTrigger && (
            <div>
              <button>Trigger</button>
            </div>
          )}
          <Modal open={open} label="M">
            <button>Inside</button>
          </Modal>
        </>
      )
    }
    const { rerender } = render(<App open={false} showTrigger />)
    screen.getByRole('button', { name: 'Trigger' }).focus()
    rerender(<App open showTrigger />)
    rerender(<App open showTrigger={false} />)
    rerender(<App open={false} showTrigger={false} />)
    expect(screen.getByRole('button', { name: 'Inside' })).not.toHaveFocus()
  })
})
