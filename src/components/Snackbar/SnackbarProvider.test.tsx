import { useEffect } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import {
  SnackbarProvider,
  useSnackbar,
  type SnackbarCloseReason,
  type SnackbarShowOptions,
  type UseSnackbarResult,
} from './SnackbarProvider'

let api: UseSnackbarResult

function Grab() {
  api = useSnackbar()
  return <button type="button">Trigger</button>
}

// user-event's async wrapper waits on a real setTimeout, which never fires
// under Vitest's fake timers — interactions use fireEvent here.
function setup() {
  return render(
    <SnackbarProvider>
      <Grab />
    </SnackbarProvider>,
  )
}

/** Shows a snackbar and records how it closed. */
function showTracked(options: SnackbarShowOptions | string) {
  const result: { reason?: SnackbarCloseReason } = {}
  act(() => {
    void api.show(options).then((r) => {
      result.reason = r
    })
  })
  return result
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

const region = () => screen.getByRole('status')

describe('SnackbarProvider / useSnackbar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('mounts the polite live region before any message is inserted', () => {
    setup()
    expect(region()).toHaveAttribute('aria-live', 'polite')
    expect(region()).toBeEmptyDOMElement()
    showTracked('Saved')
    expect(region()).toHaveTextContent('Saved')
    // The snackbar itself is not a second live region.
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it('auto-dismisses a short snackbar after 4s and resolves "timeout"', async () => {
    setup()
    const r = showTracked('Saved')
    await advance(3999)
    expect(region()).toHaveTextContent('Saved')
    expect(r.reason).toBeUndefined()
    await advance(1)
    expect(r.reason).toBe('timeout')
    await advance(150)
    expect(region()).toBeEmptyDOMElement()
  })

  it('keeps a long snackbar for 10s and accepts a millisecond duration', async () => {
    setup()
    const long = showTracked({ message: 'Long', duration: 'long' })
    await advance(9999)
    expect(long.reason).toBeUndefined()
    await advance(1)
    expect(long.reason).toBe('timeout')
    await advance(150)
    const custom = showTracked({ message: 'Custom', duration: 1500 })
    await advance(1500)
    expect(custom.reason).toBe('timeout')
  })

  it('is indefinite by default when there is an action, and resolves "action"', async () => {
    setup()
    const r = showTracked({ message: 'Deleted', actionLabel: 'Undo' })
    await advance(60_000)
    expect(r.reason).toBeUndefined()
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    await advance(0)
    expect(r.reason).toBe('action')
  })

  it('shows one snackbar at a time and queues the rest', async () => {
    setup()
    const a = showTracked('First')
    const b = showTracked('Second')
    expect(region()).toHaveTextContent('First')
    expect(region()).not.toHaveTextContent('Second')
    await advance(4000)
    expect(a.reason).toBe('timeout')
    // The next one waits for the exit to finish.
    expect(region()).not.toHaveTextContent('Second')
    await advance(150)
    expect(region()).toHaveTextContent('Second')
    expect(region()).not.toHaveTextContent('First')
    expect(b.reason).toBeUndefined()
  })

  it('resolves "dismiss" from the dismiss button and from close()', async () => {
    setup()
    const a = showTracked({ message: 'A', withDismissAction: true, dismissLabel: 'Close' })
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await advance(0)
    expect(a.reason).toBe('dismiss')
    await advance(150)
    const b = showTracked({ message: 'B', duration: 'indefinite' })
    act(() => api.close())
    await advance(0)
    expect(b.reason).toBe('dismiss')
  })

  it('dismisses with Escape when focus is inside, with or without a dismiss button', async () => {
    setup()
    const a = showTracked({ message: 'A', actionLabel: 'Undo' })
    fireEvent.keyDown(document.body, { key: 'Escape' })
    await advance(0)
    expect(a.reason).toBeUndefined()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Undo' }), { key: 'Escape' })
    await advance(0)
    expect(a.reason).toBe('escapeKeyDown')
    await advance(150)
    const b = showTracked({ message: 'B', actionLabel: 'Undo', withDismissAction: true })
    fireEvent.keyDown(screen.getByRole('button', { name: 'Dismiss' }), { key: 'Escape' })
    await advance(0)
    expect(b.reason).toBe('escapeKeyDown')
  })

  it('pauses the timer while hovered and resumes with the remaining time', async () => {
    setup()
    const r = showTracked('Hover me')
    await advance(1000)
    fireEvent.pointerEnter(screen.getByText('Hover me'))
    await advance(10_000)
    expect(r.reason).toBeUndefined()
    fireEvent.pointerLeave(screen.getByText('Hover me'))
    await advance(2999)
    expect(r.reason).toBeUndefined()
    await advance(1)
    expect(r.reason).toBe('timeout')
  })

  it('pauses the timer while focus is inside', async () => {
    setup()
    const r = showTracked({ message: 'Focus me', actionLabel: 'Retry', duration: 'short' })
    const action = screen.getByRole('button', { name: 'Retry' })
    act(() => action.focus())
    await advance(20_000)
    expect(r.reason).toBeUndefined()
    act(() => screen.getByRole('button', { name: 'Trigger' }).focus())
    await advance(4000)
    expect(r.reason).toBe('timeout')
  })

  it('returns focus to the previously focused element when a focused snackbar closes', async () => {
    setup()
    const trigger = screen.getByRole('button', { name: 'Trigger' })
    act(() => trigger.focus())
    showTracked({ message: 'Deleted', actionLabel: 'Undo' })
    const undo = screen.getByRole('button', { name: 'Undo' })
    act(() => undo.focus())
    fireEvent.click(undo)
    await advance(0)
    expect(trigger).toHaveFocus()
  })

  it('leaves focus alone when the snackbar was not focused', async () => {
    setup()
    const other = document.createElement('input')
    document.body.appendChild(other)
    other.focus()
    showTracked('Saved')
    await advance(4150)
    expect(other).toHaveFocus()
    other.remove()
  })

  it('settles pending show() promises when the provider unmounts (#423)', async () => {
    const { unmount } = setup()
    const current = showTracked({ message: 'One', actionLabel: 'Undo' })
    const queued = showTracked('Two')
    unmount()
    await advance(0)
    expect(current.reason).toBe('dismiss')
    expect(queued.reason).toBe('dismiss')
  })

  it('throws when useSnackbar is used outside a provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    function Orphan() {
      useSnackbar()
      return null
    }
    expect(() => render(<Orphan />)).toThrow(/SnackbarProvider/)
    spy.mockRestore()
  })

  it('has no axe violations while showing a snackbar', async () => {
    vi.useRealTimers()
    function ShowOnMount() {
      const { show } = useSnackbar()
      useEffect(() => {
        void show({ message: 'Deleted', actionLabel: 'Undo', withDismissAction: true })
      }, [show])
      return <main>content</main>
    }
    const { container } = render(
      <SnackbarProvider>
        <ShowOnMount />
      </SnackbarProvider>,
    )
    await screen.findByRole('button', { name: 'Undo' })
    expect(await axe(container)).toHaveNoViolations()
  })
})
