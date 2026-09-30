import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react'
import clsx from 'clsx'
import { Snackbar } from './Snackbar'
import styles from './SnackbarProvider.module.css'

/**
 * Why a snackbar shown with `useSnackbar().show()` closed — the value its
 * promise resolves with. Shares the `reason` vocabulary used across the
 * library (Phase B, B7):
 * - `'action'` — the action button was activated;
 * - `'dismiss'` — the dismiss (close) button was activated, or `close()` was
 *   called;
 * - `'timeout'` — the duration elapsed;
 * - `'escapeKeyDown'` — Escape was pressed while focus was inside it.
 */
export type SnackbarCloseReason = 'action' | 'dismiss' | 'timeout' | 'escapeKeyDown'

/**
 * How long a snackbar stays on screen: `'short'` (4s), `'long'` (10s),
 * `'indefinite'` (until the user acts or it is closed), or milliseconds.
 * Values follow Compose `SnackbarDuration.toMillis`.
 */
export type SnackbarDuration = 'short' | 'long' | 'indefinite' | number

export interface SnackbarShowOptions {
  /** The message text. Keep it short and plain. */
  message: ReactNode
  /** Label of the single action button; activating it resolves `'action'`. */
  actionLabel?: string
  /**
   * Show a trailing dismiss (close) icon button. Recommended for indefinite
   * snackbars. @default false
   */
  withDismissAction?: boolean
  /**
   * How long the snackbar stays. The timer pauses while the snackbar is
   * hovered or has focus inside it (WCAG 2.2.1).
   * @default 'indefinite' when `actionLabel` is set (m3: snackbars with an
   * action stay until the user acts), otherwise `'short'`
   */
  duration?: SnackbarDuration
  /** Place the action on its own line (for a long label). @default false */
  actionOnNewLine?: boolean
  /** Accessible label of the dismiss icon button. @default 'Dismiss' */
  dismissLabel?: string
}

export interface UseSnackbarResult {
  /**
   * Shows a snackbar, or queues it behind the one currently shown (one at a
   * time). Resolves with the reason it closed.
   */
  show: (options: SnackbarShowOptions | string) => Promise<SnackbarCloseReason>
  /** Closes the snackbar currently shown (resolves it with `'dismiss'`). */
  close: () => void
}

export interface SnackbarProviderProps {
  children?: ReactNode
  /** Class for the host (the fixed, bottom-centered placement container). */
  className?: string
  /**
   * Style for the host — e.g. raise it above a bottom navigation bar with
   * `{ bottom: 80 }`.
   */
  style?: CSSProperties
}

interface Entry {
  id: number
  options: SnackbarShowOptions
  resolve: (reason: SnackbarCloseReason) => void
  /** Element focused when the snackbar was requested (focus-return fallback). */
  trigger: Element | null
}

const SnackbarContext = createContext<UseSnackbarResult | null>(null)

/** Compose SnackbarDuration.toMillis: Short 4000 / Long 10000. */
const SHORT_MS = 4000
const LONG_MS = 10000
/**
 * Exit length — the FastEffects fade-out in SnackbarProvider.module.css
 * (--md-sys-motion-spring-fast-effects-duration, 150ms in both motion
 * schemes). The next queued snackbar enters after it.
 */
const EXIT_MS = 150

function durationMs(options: SnackbarShowOptions): number {
  const duration = options.duration ?? (options.actionLabel != null ? 'indefinite' : 'short')
  if (typeof duration === 'number') return duration
  if (duration === 'short') return SHORT_MS
  if (duration === 'long') return LONG_MS
  return Infinity
}

/**
 * Hosts snackbars for its subtree (Compose `SnackbarHost` +
 * `SnackbarHostState`). Descendants call `useSnackbar().show()`.
 *
 * - Shows one snackbar at a time; later calls queue behind it.
 * - Auto-dismiss: short 4s / long 10s / indefinite; indefinite by default when
 *   there is an action. The timer pauses on hover and while focus is inside.
 * - Placement: bottom-center with 12dp margins, filling the width up to 600dp.
 *   The host is `position: fixed` and rendered inside this provider (so it
 *   inherits the theme's color tokens) — keep the provider outside transformed
 *   ancestors.
 * - A persistent polite live region (`role="status"`) is mounted with the
 *   provider, and only its content changes, so screen readers announce each
 *   message.
 * - Escape dismisses while focus is inside; when a focused snackbar closes,
 *   focus returns to the element focused before it.
 * - Enter / exit: fade + scale 0.8↔1; fade only under reduced motion.
 *
 * Web guidance (m3 a11y): information in an auto-dismissing snackbar must also
 * be available elsewhere in the UI, and apps should offer a documented
 * shortcut (e.g. Alt+G) to move focus to a snackbar with an action.
 */
export function SnackbarProvider({ children, className, style }: SnackbarProviderProps) {
  const [queue, setQueue] = useState<Entry[]>([])
  const [exitingId, setExitingId] = useState<number | null>(null)
  const nextId = useRef(0)
  const queueRef = useRef(queue)
  queueRef.current = queue
  const closingRef = useRef<number | null>(null)
  const itemRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<Element | null>(null)
  const exitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(exitTimer.current), [])

  const closeCurrent = useCallback((reason: SnackbarCloseReason) => {
    const current = queueRef.current[0]
    if (current == null || closingRef.current === current.id) return
    closingRef.current = current.id

    // Focus return: only when focus is inside the closing snackbar.
    const item = itemRef.current
    const active = document.activeElement
    if (item != null && active != null && item.contains(active)) {
      const target = restoreRef.current ?? current.trigger
      if (target instanceof HTMLElement && target.isConnected) {
        target.focus()
      } else if (active instanceof HTMLElement) {
        active.blur()
      }
    }
    restoreRef.current = null

    current.resolve(reason)
    setExitingId(current.id)
    exitTimer.current = setTimeout(() => {
      closingRef.current = null
      setExitingId(null)
      setQueue((q) => q.filter((e) => e.id !== current.id))
    }, EXIT_MS)
  }, [])

  const show = useCallback(
    (input: SnackbarShowOptions | string) =>
      new Promise<SnackbarCloseReason>((resolve) => {
        const options = typeof input === 'string' ? { message: input } : input
        const entry: Entry = {
          id: nextId.current++,
          options,
          resolve,
          trigger: typeof document !== 'undefined' ? document.activeElement : null,
        }
        setQueue((q) => [...q, entry])
      }),
    [],
  )

  const close = useCallback(() => closeCurrent('dismiss'), [closeCurrent])
  const value = useMemo(() => ({ show, close }), [show, close])

  const current = queue[0]

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    const from = event.relatedTarget
    if (from instanceof Element && !event.currentTarget.contains(from)) {
      restoreRef.current = from
    }
  }

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <div className={clsx(styles.host, className)} style={style}>
        {/* Persistent live region: mounted before any message is inserted. */}
        <div role="status" aria-live="polite" className={styles.region}>
          {current != null && (
            <HostedSnackbar
              key={current.id}
              itemRef={itemRef}
              entry={current}
              exiting={exitingId === current.id}
              onClose={closeCurrent}
              onFocus={handleFocus}
            />
          )}
        </div>
      </div>
    </SnackbarContext.Provider>
  )
}

interface HostedSnackbarProps {
  itemRef: Ref<HTMLDivElement>
  entry: Entry
  exiting: boolean
  onClose: (reason: SnackbarCloseReason) => void
  onFocus: (event: FocusEvent<HTMLDivElement>) => void
}

function HostedSnackbar({ itemRef, entry, exiting, onClose, onFocus }: HostedSnackbarProps) {
  const { options } = entry
  const total = durationMs(options)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const remaining = useRef(total)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Auto-dismiss timer, paused while hovered / focused (WCAG 2.2.1) and
  // resumed with the remaining time.
  useEffect(() => {
    if (exiting || hovered || focused || !Number.isFinite(total)) return
    const start = Date.now()
    const timer = setTimeout(() => onCloseRef.current('timeout'), Math.max(0, remaining.current))
    return () => {
      clearTimeout(timer)
      remaining.current -= Date.now() - start
    }
  }, [exiting, hovered, focused, total])

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const to = event.relatedTarget
    if (!(to instanceof Node && event.currentTarget.contains(to))) setFocused(false)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !event.defaultPrevented) {
      event.preventDefault()
      onClose('escapeKeyDown')
    }
  }

  return (
    <div
      ref={itemRef}
      className={styles.item}
      data-state={exiting ? 'exiting' : 'entered'}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={(event) => {
        setFocused(true)
        onFocus(event)
      }}
      onBlur={handleBlur}
    >
      <Snackbar
        // The host's region is the live region.
        role={undefined}
        aria-live={undefined}
        message={options.message}
        action={
          options.actionLabel != null
            ? { label: options.actionLabel, onClick: () => onClose('action') }
            : undefined
        }
        onDismiss={options.withDismissAction ? () => onClose('dismiss') : undefined}
        dismissLabel={options.dismissLabel}
        actionOnNewLine={options.actionOnNewLine}
        onKeyDown={handleKeyDown}
      />
    </div>
  )
}

/**
 * Returns `{ show, close }` for the nearest {@link SnackbarProvider}.
 *
 * ```tsx
 * const { show } = useSnackbar()
 * const reason = await show({ message: 'Message deleted', actionLabel: 'Undo' })
 * if (reason === 'action') restore()
 * ```
 */
export function useSnackbar(): UseSnackbarResult {
  const context = useContext(SnackbarContext)
  if (context == null) {
    throw new Error('useSnackbar must be used within a <SnackbarProvider>.')
  }
  return context
}
