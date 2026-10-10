import {
  Children,
  cloneElement,
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type HTMLAttributes,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
import clsx from 'clsx'
import { usePopupPosition } from '../../internal/usePopupPosition'
import styles from './Tooltip.module.css'

export type TooltipVariant = 'plain' | 'rich'
export type TooltipPlacement = 'top' | 'bottom'

export interface TooltipProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** The trigger element (a single focusable/hoverable element). */
  children: ReactElement
  /** Plain style or rich (with subhead + action). @default 'plain' */
  variant?: TooltipVariant
  /** Body / supporting text. */
  text?: ReactNode
  /** Rich tooltip subhead (title). */
  subhead?: ReactNode
  /**
   * Rich tooltip action(s) — up to two text buttons, laid out side by side.
   * A rich tooltip with an action becomes a non-modal `role="dialog"` whose
   * actions are reachable with Tab from the trigger; consider `persistent`.
   */
  action?: ReactNode
  /**
   * Preferred placement relative to the trigger. The tooltip flips to the
   * other side when there is no room and is kept inside the viewport.
   * Inside a top app bar, use `'bottom'`.
   * @default 'top' for plain, 'bottom' for rich
   */
  placement?: TooltipPlacement
  /**
   * Persistent rich tooltip: opens and closes on click / tap of the trigger
   * (hover, focus and long-press don't open it) and stays open until the user
   * interacts elsewhere (outside press, Escape, or focus leaving the trigger
   * and tooltip). Recommended when the tooltip has an `action`; avoid it on
   * icon buttons. @default false
   */
  persistent?: boolean
  /** Uncontrolled initial visibility. @default false */
  defaultOpen?: boolean
  /** Controlled visibility. */
  open?: boolean
  /** Notified when visibility should change. */
  onOpenChange?: (open: boolean) => void
}

/** m3: tooltips disappear 1.5 s after navigating away from the target region. */
const HIDE_DELAY_MS = 1500
/** Touch long-press threshold (Compose uses the platform long-press timeout). */
const LONG_PRESS_MS = 500
/** Finger travel that cancels a pending long-press. */
const LONG_PRESS_SLOP_PX = 10
/** Distance between the anchor and the tooltip (Compose SpacingBetweenTooltipAndAnchor). */
const ANCHOR_GAP_PX = 4
/** Minimum distance kept from the viewport edges when clamping. */
const VIEWPORT_MARGIN_PX = 8

/**
 * Only one tooltip is shown at a time (m3 "Triggering a new tooltip immediately
 * closes any other open tooltip"; Compose shares a `GlobalMutatorMutex`).
 */
let activeTooltip: { close: () => void } | null = null

function compose<E>(
  theirs: ((event: E) => void) | undefined,
  ours: (event: E) => void,
) {
  return (event: E) => {
    theirs?.(event)
    ours(event)
  }
}

/** Focus arriving this soon after a touch press came from the tap itself. */
const TOUCH_FOCUS_WINDOW_MS = 1000

function assignRef<T>(ref: Ref<T> | undefined, value: T) {
  if (typeof ref === 'function') ref(value)
  else if (ref) (ref as { current: T }).current = value
}

/**
 * Material Design 3 Tooltip.
 *
 * Wraps a single trigger element. Plain (InverseSurface, 4dp, BodySmall) or
 * rich (SurfaceContainer, 12dp, elevation 2, with a subhead and optional
 * actions). The popup is positioned by the shared popup helper (flip + clamp,
 * drawn in the top layer via the Popover API).
 *
 * Behavior (m3 + WCAG 1.4.13): opens on hover, keyboard focus, or touch
 * long-press; stays open while the pointer is over the trigger or the tooltip
 * and while focus is inside either; closes 1.5 s after the pointer / focus
 * leaves, on Escape (wherever focus is), or on a press elsewhere. Only one
 * tooltip is open at a time. `persistent` rich tooltips toggle on click
 * instead. The trigger gets `aria-describedby` while open; the popup is
 * `role="tooltip"`, or a non-modal `role="dialog"` labelled by its subhead when
 * a rich tooltip has an action (so the action is reachable with Tab).
 */
export const Tooltip = forwardRef<HTMLSpanElement, TooltipProps>(function Tooltip(
  {
    children,
    variant = 'plain',
    text,
    subhead,
    action,
    placement,
    persistent = false,
    defaultOpen = false,
    open,
    onOpenChange,
    className,
    onFocus,
    onBlur,
    onClickCapture,
    ...rest
  },
  ref,
) {
  const id = useId()
  const subheadId = `${id}-subhead`
  const textId = `${id}-text`
  const wrapperRef = useRef<HTMLSpanElement | null>(null)
  const popupRef = useRef<HTMLDivElement | null>(null)

  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : uncontrolledOpen

  const isRich = variant === 'rich'
  const hasSubhead = isRich && subhead != null
  const hasAction = isRich && action != null

  // Latest values for timers and document listeners.
  const openRef = useRef(isOpen)
  openRef.current = isOpen
  const setOpen = (value: boolean) => {
    if (openRef.current === value) return
    openRef.current = value
    if (!isControlled) setUncontrolledOpen(value)
    onOpenChange?.(value)
  }
  const setOpenRef = useRef(setOpen)
  setOpenRef.current = setOpen
  const persistentRef = useRef(persistent)
  persistentRef.current = persistent

  // Interaction state.
  const hovered = useRef(false)
  const focusWithin = useRef(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const longPress = useRef<{
    timer?: ReturnType<typeof setTimeout>
    x: number
    y: number
    fired: boolean
    suppressClick: boolean
  }>({ x: 0, y: 0, fired: false, suppressClick: false })

  const lastTouchAt = useRef(-Infinity)
  const escapeDismissed = useRef(false)

  const cancelHide = () => {
    clearTimeout(hideTimer.current)
    hideTimer.current = undefined
  }
  const close = () => {
    cancelHide()
    setOpenRef.current(false)
  }
  const scheduleHide = () => {
    cancelHide()
    hideTimer.current = setTimeout(close, HIDE_DELAY_MS)
  }
  const maybeScheduleHide = () => {
    if (persistentRef.current || !openRef.current) return
    if (!hovered.current && !focusWithin.current) scheduleHide()
  }
  const show = () => {
    cancelHide()
    setOpen(true)
  }

  useEffect(
    () => () => {
      clearTimeout(hideTimer.current)
      clearTimeout(longPress.current.timer)
    },
    [],
  )

  // One tooltip at a time.
  useEffect(() => {
    if (!isOpen) return
    const self = { close }
    if (activeTooltip && activeTooltip !== self) activeTooltip.close()
    activeTooltip = self
    return () => {
      if (activeTooltip === self) activeTooltip = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Dismissal while open: Escape anywhere (WCAG 1.4.13 "dismissible") and a
  // press outside the trigger + tooltip ("interacts with another UI element").
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      // Consumed: an enclosing modal (useModal) ignores a prevented Escape,
      // so one press dismisses only the tooltip.
      event.preventDefault()
      const focusInPopup = popupRef.current?.contains(document.activeElement) ?? false
      escapeDismissed.current = focusWithin.current
      close()
      if (focusInPopup) {
        ;(wrapperRef.current?.firstElementChild as HTMLElement | null)?.focus()
      }
    }
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (wrapperRef.current?.contains(event.target as Node)) return
      close()
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const side = usePopupPosition({
    open: isOpen,
    anchorRef: wrapperRef,
    popupRef,
    side: placement ?? (isRich ? 'bottom' : 'top'),
    gap: ANCHOR_GAP_PX,
    margin: VIEWPORT_MARGIN_PX,
  })

  const child = Children.only(children) as ReactElement<{
    'aria-describedby'?: string
    'aria-expanded'?: boolean
    'aria-haspopup'?: 'dialog'
    'aria-controls'?: string
    onPointerEnter?: (event: PointerEvent) => void
    onPointerLeave?: (event: PointerEvent) => void
    onPointerDown?: (event: PointerEvent) => void
    onPointerMove?: (event: PointerEvent) => void
    onPointerUp?: (event: PointerEvent) => void
    onPointerCancel?: (event: PointerEvent) => void
    onContextMenu?: (event: MouseEvent) => void
    onClick?: (event: MouseEvent) => void
  }>

  // Popup ARIA: a rich tooltip with actions is a non-modal dialog (B11) whose
  // content the trigger is described by; otherwise the popup is the tooltip.
  const descriptionIds = hasAction
    ? [hasSubhead ? subheadId : undefined, text != null ? textId : undefined]
    : [id]
  const describedBy =
    [child.props['aria-describedby'], ...(isOpen ? descriptionIds : [])]
      .filter(Boolean)
      .join(' ') || undefined

  const clearLongPress = () => {
    clearTimeout(longPress.current.timer)
    longPress.current.timer = undefined
  }

  const trigger = cloneElement(child, {
    'aria-describedby': describedBy,
    ...(persistent && {
      'aria-expanded': isOpen,
      'aria-haspopup': hasAction ? 'dialog' : undefined,
      'aria-controls': isOpen ? id : undefined,
    }),
    // Pointer events (not mouse events) so the compatibility mouse events a
    // touch tap fires don't open the tooltip; touch uses long-press instead.
    onPointerEnter: compose(child.props.onPointerEnter, (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      hovered.current = true
      if (!persistentRef.current) show()
      else cancelHide()
    }),
    onPointerLeave: compose(child.props.onPointerLeave, (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      hovered.current = false
      maybeScheduleHide()
    }),
    onPointerDown: compose(child.props.onPointerDown, (event: PointerEvent) => {
      // A browser may not follow a long-press with a click; never let a stale
      // flag eat the next press.
      longPress.current.suppressClick = false
      if (event.pointerType !== 'touch') return
      lastTouchAt.current = Date.now()
      if (persistentRef.current) return
      clearLongPress()
      const state = longPress.current
      state.x = event.clientX
      state.y = event.clientY
      state.fired = false
      state.timer = setTimeout(() => {
        state.timer = undefined
        state.fired = true
        show()
      }, LONG_PRESS_MS)
    }),
    onPointerMove: compose(child.props.onPointerMove, (event: PointerEvent) => {
      const state = longPress.current
      if (event.pointerType !== 'touch' || state.timer === undefined) return
      if (Math.hypot(event.clientX - state.x, event.clientY - state.y) > LONG_PRESS_SLOP_PX) {
        clearLongPress()
      }
    }),
    onPointerUp: compose(child.props.onPointerUp, (event: PointerEvent) => {
      if (event.pointerType !== 'touch') return
      lastTouchAt.current = Date.now()
      clearLongPress()
      const state = longPress.current
      if (state.fired) {
        // The release is consumed (see handleClickCapture) and the tooltip
        // stays for the grace period.
        state.fired = false
        state.suppressClick = true
        scheduleHide()
      }
    }),
    onPointerCancel: compose(child.props.onPointerCancel, (event: PointerEvent) => {
      if (event.pointerType !== 'touch') return
      clearLongPress()
      if (longPress.current.fired) {
        longPress.current.fired = false
        scheduleHide()
      }
    }),
    onContextMenu: (event: MouseEvent) => {
      // Mobile browsers raise a context menu on long-press.
      if (longPress.current.fired || longPress.current.timer !== undefined) {
        event.preventDefault()
        return
      }
      child.props.onContextMenu?.(event)
    },
    onClick: (event: MouseEvent) => {
      child.props.onClick?.(event)
      if (persistentRef.current && !event.defaultPrevented) {
        if (openRef.current) close()
        else show()
      }
    },
  } as Partial<typeof child.props>)

  const handleFocus = (event: FocusEvent<HTMLSpanElement>) => {
    onFocus?.(event)
    focusWithin.current = true
    // The focus a touch tap gives the trigger neither opens the tooltip (touch
    // opens on long-press only) nor cancels the long-press hide delay.
    if (Date.now() - lastTouchAt.current < TOUCH_FOCUS_WINDOW_MS) return
    cancelHide()
    const triggerEl = wrapperRef.current?.firstElementChild
    // Focus on the trigger opens a transient tooltip, unless it was just
    // dismissed with Escape (focus returning to the trigger mustn't reopen it).
    if (!persistent && event.target === triggerEl && !escapeDismissed.current) {
      setOpen(true)
    }
  }

  const handleBlur = (event: FocusEvent<HTMLSpanElement>) => {
    onBlur?.(event)
    const next = event.relatedTarget as Node | null
    // Focus moving between the trigger and the tooltip's actions keeps it open.
    if (next && wrapperRef.current?.contains(next)) return
    focusWithin.current = false
    escapeDismissed.current = false
    if (persistent) {
      if (isOpen) close()
    } else {
      maybeScheduleHide()
    }
  }

  // The release after a long-press is consumed (Compose): stop its click in
  // the capture phase so no handler on the trigger sees it.
  const handleClickCapture = (event: MouseEvent<HTMLSpanElement>) => {
    onClickCapture?.(event)
    if (!longPress.current.suppressClick) return
    longPress.current.suppressClick = false
    event.preventDefault()
    event.stopPropagation()
  }

  const setWrapperRef = (node: HTMLSpanElement | null) => {
    wrapperRef.current = node
    assignRef(ref, node)
  }

  return (
    <span
      {...rest}
      ref={setWrapperRef}
      className={clsx(styles.wrapper, className)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClickCapture={handleClickCapture}
    >
      {trigger}
      <div
        ref={popupRef}
        id={id}
        role={hasAction ? 'dialog' : 'tooltip'}
        aria-labelledby={
          hasAction ? (hasSubhead ? subheadId : text != null ? textId : undefined) : undefined
        }
        data-variant={variant}
        data-placement={side}
        data-has-action={hasAction || undefined}
        data-open={isOpen || undefined}
        className={clsx(styles.tooltip, isOpen && styles.open)}
        onPointerEnter={(event) => {
          if (event.pointerType === 'touch') return
          hovered.current = true
          cancelHide()
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === 'touch') return
          hovered.current = false
          maybeScheduleHide()
        }}
      >
        {hasSubhead && (
          <div id={subheadId} className={styles.subhead}>
            {subhead}
          </div>
        )}
        {text != null && (
          <div id={textId} className={styles.text}>
            {text}
          </div>
        )}
        {hasAction && <div className={styles.action}>{action}</div>}
      </div>
    </span>
  )
})
