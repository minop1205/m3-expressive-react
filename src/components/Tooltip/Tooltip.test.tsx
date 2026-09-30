import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { Tooltip } from './Tooltip'

const HIDE_DELAY = 1500

function setupFake() {
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['setTimeout', 'clearTimeout'] })
  return userEvent.setup({ delay: null })
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

function isShown(trigger: HTMLElement) {
  return (trigger.getAttribute('aria-describedby') ?? '') !== ''
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Tooltip', () => {
  it('shows on hover and links via aria-describedby', async () => {
    const user = setupFake()
    render(
      <Tooltip text="Helpful hint">
        <button>Trigger</button>
      </Tooltip>,
    )
    const trigger = screen.getByRole('button', { name: 'Trigger' })
    expect(trigger).not.toHaveAttribute('aria-describedby')

    await user.hover(trigger)
    const tip = screen.getByRole('tooltip')
    expect(tip).toHaveTextContent('Helpful hint')
    expect(trigger).toHaveAttribute('aria-describedby', tip.id)

    await user.unhover(trigger)
    advance(HIDE_DELAY)
    expect(trigger).not.toHaveAttribute('aria-describedby')
  })

  describe('hide delay and hoverable content (WCAG 1.4.13)', () => {
    it('stays open for 1.5 s after the pointer leaves', async () => {
      const user = setupFake()
      render(
        <Tooltip text="Hint">
          <button>Trigger</button>
        </Tooltip>,
      )
      const trigger = screen.getByRole('button')
      await user.hover(trigger)
      await user.unhover(trigger)
      advance(HIDE_DELAY - 100)
      expect(isShown(trigger)).toBe(true)
      advance(100)
      expect(isShown(trigger)).toBe(false)
    })

    it('keeps a plain tooltip open while the pointer moves onto it', async () => {
      const user = setupFake()
      render(
        <Tooltip text="Hint">
          <button>Trigger</button>
        </Tooltip>,
      )
      const trigger = screen.getByRole('button')
      await user.hover(trigger)
      const tip = screen.getByRole('tooltip')
      await user.hover(tip)
      advance(HIDE_DELAY * 2)
      expect(isShown(trigger)).toBe(true)

      await user.unhover(tip)
      advance(HIDE_DELAY)
      expect(isShown(trigger)).toBe(false)
    })

    it('re-entering the trigger cancels the pending hide', async () => {
      const user = setupFake()
      render(
        <Tooltip text="Hint">
          <button>Trigger</button>
        </Tooltip>,
      )
      const trigger = screen.getByRole('button')
      await user.hover(trigger)
      await user.unhover(trigger)
      advance(HIDE_DELAY - 500)
      await user.hover(trigger)
      advance(HIDE_DELAY * 2)
      expect(isShown(trigger)).toBe(true)
    })

    it('closes 1.5 s after focus leaves the trigger', async () => {
      const user = setupFake()
      render(
        <>
          <Tooltip text="Hint">
            <button>Trigger</button>
          </Tooltip>
          <button>Next</button>
        </>,
      )
      const trigger = screen.getByRole('button', { name: 'Trigger' })
      await user.tab()
      expect(isShown(trigger)).toBe(true)
      await user.tab()
      expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus()
      expect(isShown(trigger)).toBe(true)
      advance(HIDE_DELAY)
      expect(isShown(trigger)).toBe(false)
    })

    it('does not auto-dismiss a tooltip while its trigger keeps focus', async () => {
      const user = setupFake()
      render(
        <Tooltip text="Hint">
          <button>Trigger</button>
        </Tooltip>,
      )
      await user.tab()
      advance(HIDE_DELAY * 4)
      expect(isShown(screen.getByRole('button'))).toBe(true)
    })

    it('closes on Escape when opened by hover while focus is elsewhere', async () => {
      const user = setupFake()
      render(
        <>
          <input aria-label="Elsewhere" />
          <Tooltip text="Hint">
            <button>Trigger</button>
          </Tooltip>
        </>,
      )
      await user.click(screen.getByRole('textbox'))
      const trigger = screen.getByRole('button')
      await user.hover(trigger)
      expect(isShown(trigger)).toBe(true)
      await user.keyboard('{Escape}')
      expect(isShown(trigger)).toBe(false)
      // The pointer is still over the trigger; it doesn't reopen by itself.
      advance(HIDE_DELAY)
      expect(isShown(trigger)).toBe(false)
    })
  })

  it('shows on keyboard focus and hides on Escape', async () => {
    const user = userEvent.setup()
    render(
      <Tooltip text="Hint">
        <button>Trigger</button>
      </Tooltip>,
    )
    const trigger = screen.getByRole('button')
    await user.tab()
    expect(trigger).toHaveFocus()
    expect(trigger).toHaveAttribute('aria-describedby')
    await user.keyboard('{Escape}')
    expect(trigger).not.toHaveAttribute('aria-describedby')
  })

  it('renders rich content (subhead + action)', async () => {
    const user = userEvent.setup()
    render(
      <Tooltip variant="rich" subhead="Title" text="Body" action={<button>Act</button>}>
        <button>Trigger</button>
      </Tooltip>,
    )
    await user.hover(screen.getByRole('button', { name: 'Trigger' }))
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Body')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Act' })).toBeInTheDocument()
  })

  describe('rich tooltip with an action', () => {
    it('is a non-modal dialog labelled by its subhead', async () => {
      const user = userEvent.setup()
      render(
        <Tooltip variant="rich" subhead="Title" text="Body" action={<button>Act</button>}>
          <button>Trigger</button>
        </Tooltip>,
      )
      const trigger = screen.getByRole('button', { name: 'Trigger' })
      await user.hover(trigger)
      const dialog = screen.getByRole('dialog', { name: 'Title' })
      expect(dialog).not.toHaveAttribute('aria-modal')
      expect(screen.queryByRole('tooltip')).toBeNull()
      // The trigger is described by the tooltip's content, not its actions.
      expect(trigger).toHaveAccessibleDescription('Title Body')
    })

    it('keeps role="tooltip" when there is no action', async () => {
      const user = userEvent.setup()
      render(
        <Tooltip variant="rich" subhead="Title" text="Body">
          <button>Trigger</button>
        </Tooltip>,
      )
      await user.hover(screen.getByRole('button'))
      expect(screen.getByRole('tooltip')).toHaveTextContent('TitleBody')
    })

    it('Tab moves from the trigger into the actions and the tooltip stays open', async () => {
      const user = setupFake()
      render(
        <>
          <Tooltip
            variant="rich"
            subhead="Title"
            text="Body"
            action={
              <>
                <button>First</button>
                <button>Second</button>
              </>
            }
          >
            <button>Trigger</button>
          </Tooltip>
          <button>After</button>
        </>,
      )
      const trigger = screen.getByRole('button', { name: 'Trigger' })
      await user.tab()
      expect(trigger).toHaveFocus()
      await user.tab()
      expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()
      await user.tab()
      expect(screen.getByRole('button', { name: 'Second' })).toHaveFocus()
      advance(HIDE_DELAY * 2)
      expect(isShown(trigger)).toBe(true)

      await user.tab({ shift: true })
      await user.tab({ shift: true })
      expect(trigger).toHaveFocus()
      expect(isShown(trigger)).toBe(true)

      // Leaving the region altogether starts the hide delay (no focus trap).
      await user.tab()
      await user.tab()
      await user.tab()
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
      advance(HIDE_DELAY)
      expect(isShown(trigger)).toBe(false)
    })

    it('Escape inside the tooltip closes it and returns focus to the trigger', async () => {
      const user = userEvent.setup()
      render(
        <Tooltip variant="rich" text="Body" action={<button>Act</button>}>
          <button>Trigger</button>
        </Tooltip>,
      )
      await user.tab()
      await user.tab()
      expect(screen.getByRole('button', { name: 'Act' })).toHaveFocus()
      await user.keyboard('{Escape}')
      const trigger = screen.getByRole('button', { name: 'Trigger' })
      expect(trigger).toHaveFocus()
      expect(isShown(trigger)).toBe(false)
    })
  })

  describe('persistent', () => {
    function renderPersistent(onOpenChange?: (open: boolean) => void) {
      return render(
        <>
          <Tooltip
            variant="rich"
            persistent
            subhead="New feature"
            text="Body"
            action={<button>Learn more</button>}
            onOpenChange={onOpenChange}
          >
            <button>Details</button>
          </Tooltip>
          <button>Outside</button>
        </>,
      )
    }

    it('does not open on hover or focus, toggles on click', async () => {
      const user = userEvent.setup()
      renderPersistent()
      const trigger = screen.getByRole('button', { name: 'Details' })
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')

      await user.hover(trigger)
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      await user.tab()
      expect(trigger).toHaveFocus()
      expect(trigger).toHaveAttribute('aria-expanded', 'false')

      await user.click(trigger)
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
      expect(trigger).toHaveAttribute('aria-controls', screen.getByRole('dialog').id)
      await user.click(trigger)
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })

    it('stays open after the pointer leaves', async () => {
      const user = setupFake()
      renderPersistent()
      const trigger = screen.getByRole('button', { name: 'Details' })
      await user.click(trigger)
      await user.unhover(trigger)
      advance(HIDE_DELAY * 3)
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
    })

    it('closes on an outside press', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      renderPersistent(onOpenChange)
      const trigger = screen.getByRole('button', { name: 'Details' })
      await user.click(trigger)
      await user.click(screen.getByRole('button', { name: 'Learn more' }))
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
      await user.click(screen.getByRole('button', { name: 'Outside' }))
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(onOpenChange.mock.calls).toEqual([[true], [false]])
    })

    it('closes on Escape and when focus leaves the trigger and tooltip', async () => {
      const user = userEvent.setup()
      renderPersistent()
      const trigger = screen.getByRole('button', { name: 'Details' })
      await user.click(trigger)
      await user.keyboard('{Escape}')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')

      await user.click(trigger)
      await user.tab()
      expect(screen.getByRole('button', { name: 'Learn more' })).toHaveFocus()
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
      await user.tab()
      expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus()
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })
  })

  describe('touch', () => {
    it('opens on long-press, consumes the release click, and hides after the delay', async () => {
      const user = setupFake()
      const onClick = vi.fn()
      render(
        <Tooltip text="Hint">
          <button onClick={onClick}>Trigger</button>
        </Tooltip>,
      )
      const trigger = screen.getByRole('button')
      await user.pointer({ keys: '[TouchA>]', target: trigger })
      expect(isShown(trigger)).toBe(false)
      advance(500)
      expect(isShown(trigger)).toBe(true)
      await user.pointer({ keys: '[/TouchA]', target: trigger })
      expect(onClick).not.toHaveBeenCalled()
      expect(isShown(trigger)).toBe(true)
      advance(HIDE_DELAY)
      expect(isShown(trigger)).toBe(false)
    })

    it('a short tap neither opens the tooltip nor blocks the click', async () => {
      const user = setupFake()
      const onClick = vi.fn()
      render(
        <Tooltip text="Hint">
          <button onClick={onClick}>Trigger</button>
        </Tooltip>,
      )
      const trigger = screen.getByRole('button')
      await user.pointer({ keys: '[TouchA]', target: trigger })
      advance(HIDE_DELAY)
      expect(onClick).toHaveBeenCalledTimes(1)
      expect(isShown(trigger)).toBe(false)
    })

    it('moving the finger cancels the long-press', () => {
      vi.useFakeTimers()
      render(
        <Tooltip text="Hint">
          <button>Trigger</button>
        </Tooltip>,
      )
      const trigger = screen.getByRole('button')
      fireEvent.pointerDown(trigger, { pointerType: 'touch', clientX: 0, clientY: 0 })
      fireEvent.pointerMove(trigger, { pointerType: 'touch', clientX: 0, clientY: 30 })
      advance(1000)
      expect(isShown(trigger)).toBe(false)
    })
  })

  it('shows only one tooltip at a time', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Tooltip text="First hint">
          <button>First</button>
        </Tooltip>
        <Tooltip text="Second hint">
          <button>Second</button>
        </Tooltip>
      </>,
    )
    const first = screen.getByRole('button', { name: 'First' })
    const second = screen.getByRole('button', { name: 'Second' })
    await user.tab()
    expect(isShown(first)).toBe(true)
    // Hovering another trigger while the first keeps focus.
    await user.hover(second)
    expect(isShown(second)).toBe(true)
    expect(isShown(first)).toBe(false)
  })

  it('defaults the rich tooltip to bottom and plain to top', () => {
    // An anchor in the middle of the viewport, so neither side has to flip.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 300, y: 300, width: 40, height: 40 }),
    )
    render(
      <>
        <Tooltip text="Plain" defaultOpen>
          <button>A</button>
        </Tooltip>
        <Tooltip variant="rich" text="Rich" open>
          <button>B</button>
        </Tooltip>
      </>,
    )
    const [plain, rich] = document.querySelectorAll('[data-variant]')
    expect(plain).toHaveAttribute('data-placement', 'top')
    expect(rich).toHaveAttribute('data-placement', 'bottom')
  })

  it('supports controlled open', async () => {
    const user = setupFake()
    const onOpenChange = vi.fn()
    const { rerender } = render(
      <Tooltip text="Hint" open={false} onOpenChange={onOpenChange}>
        <button>Trigger</button>
      </Tooltip>,
    )
    const trigger = screen.getByRole('button')
    await user.hover(trigger)
    expect(onOpenChange).toHaveBeenLastCalledWith(true)
    expect(isShown(trigger)).toBe(false)
    rerender(
      <Tooltip text="Hint" open onOpenChange={onOpenChange}>
        <button>Trigger</button>
      </Tooltip>,
    )
    expect(isShown(trigger)).toBe(true)
    await user.unhover(trigger)
    advance(HIDE_DELAY)
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  it('preserves the trigger existing handlers', async () => {
    const user = userEvent.setup()
    let entered = false
    render(
      <Tooltip text="Hint">
        <button onMouseEnter={() => (entered = true)}>Trigger</button>
      </Tooltip>,
    )
    await user.hover(screen.getByRole('button'))
    expect(entered).toBe(true)
  })

  it('passes HTML attributes through to the root element', () => {
    render(
      <Tooltip
        text="Hint"
        data-testid="tooltip-root"
        style={{ marginTop: 8 }}
        aria-label="Tooltip wrapper"
      >
        <button>Trigger</button>
      </Tooltip>,
    )
    const root = screen.getByTestId('tooltip-root')
    expect(root).toHaveStyle({ marginTop: '8px' })
    expect(root).toHaveAttribute('aria-label', 'Tooltip wrapper')
  })

  it('merges a custom className with the internal one', () => {
    render(
      <Tooltip text="Hint" data-testid="tooltip-root" className="custom">
        <button>Trigger</button>
      </Tooltip>,
    )
    const root = screen.getByTestId('tooltip-root')
    expect(root).toHaveClass('custom')
    expect(root.className.split(' ').length).toBeGreaterThan(1)
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <Tooltip text="Hint">
        <button>Trigger</button>
      </Tooltip>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations while open (plain, rich, persistent rich)', async () => {
    const { container } = render(
      <div>
        <Tooltip text="Plain hint" open>
          <button aria-label="Favorite">★</button>
        </Tooltip>
        <Tooltip variant="rich" subhead="Title" text="Body" open>
          <button>Rich</button>
        </Tooltip>
        <Tooltip
          variant="rich"
          persistent
          subhead="New"
          text="Body"
          action={<button>Learn more</button>}
          open
        >
          <button>Persistent</button>
        </Tooltip>
      </div>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
