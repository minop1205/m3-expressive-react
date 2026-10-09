import {
  Children,
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { getToolbarItems, handleToolbarKeyDown } from '../../internal/toolbarNavigation'
import { holdsKeyboardFocus, releaseFocus } from '../../internal/barFocus'
import {
  resolveScrollTarget,
  useScrollObserver,
  type ScrollTarget,
} from '../../internal/useScrollObserver'
import styles from './Toolbar.module.css'

export type ToolbarVariant = 'docked' | 'floating'
export type ToolbarColor = 'standard' | 'vibrant'
export type ToolbarOrientation = 'horizontal' | 'vertical'

/**
 * Built-in scroll behaviors:
 * - `exitAlways` — the toolbar slides off the screen edge (down; a vertical
 *   floating toolbar toward the inline end) as the content scrolls forward and
 *   comes back as it scrolls back; a half-hidden toolbar settles when
 *   scrolling stops (Compose `FloatingToolbarDefaults.exitAlwaysScrollBehavior`).
 * - `collapse` — a floating toolbar collapses to its `children` (hiding
 *   `startContent` / `endContent`) after 40px of forward scrolling and expands
 *   after 40px back (Compose `floatingToolbarVerticalNestedScroll`), driving
 *   `expanded` / `onExpandedChange`.
 */
export type ToolbarScrollBehavior = 'exitAlways' | 'collapse'

export interface ToolbarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'hidden'> {
  /** Docked (full-width bar) or floating (rounded, elevated). @default 'docked' */
  variant?: ToolbarVariant
  /** Color scheme. @default 'standard' */
  color?: ToolbarColor
  /** Item flow direction (floating only). @default 'horizontal' */
  orientation?: ToolbarOrientation
  /** Slots — usually icon buttons, buttons, or text fields. Always shown. */
  children?: ReactNode
  /**
   * Floating: items before `children` that are shown only while `expanded`
   * (Compose `leadingContent`). On a docked toolbar they are plain items.
   */
  startContent?: ReactNode
  /**
   * Floating: items after `children` that are shown only while `expanded`
   * (Compose `trailingContent`). On a docked toolbar they are plain items.
   */
  endContent?: ReactNode
  /**
   * Floating: whether `startContent` / `endContent` are shown (controlled).
   * Collapsed content is `inert`. A floating toolbar with no `children`
   * collapses away entirely — pair it with a separate FAB for the m3
   * "floating toolbar with FAB" pattern (grow the FAB to `size="medium"`,
   * 80dp, while collapsed).
   */
  expanded?: boolean
  /** Initial `expanded` when uncontrolled. @default true */
  defaultExpanded?: boolean
  /** Called when `expanded` should change (e.g. by `scrollBehavior="collapse"`). */
  onExpandedChange?: (expanded: boolean) => void
  /**
   * State: slides the toolbar off the screen edge (see `scrollBehavior`) and
   * makes it `inert`. Unlike the native `hidden` attribute it keeps its
   * layout box. Overrides `scrollBehavior="exitAlways"`.
   */
  hidden?: boolean
  /**
   * Observe `scrollTarget` and hide / collapse the toolbar automatically. A
   * docked toolbar becomes `position: sticky; bottom: 0`; position a floating
   * one yourself (e.g. `position: fixed`, 16dp from the edge). Leave it unset
   * to keep every control on screen — e.g. for assistive-technology users
   * (Compose disables these behaviors while TalkBack is on). Motion is
   * instant under `prefers-reduced-motion: reduce`.
   */
  scrollBehavior?: ToolbarScrollBehavior
  /** The scroll container observed by `scrollBehavior`. @default window */
  scrollTarget?: ScrollTarget
}

// Compose FloatingToolbarDefaults.ScrollDistanceThreshold.
const COLLAPSE_THRESHOLD = 40

/**
 * Material Design 3 (Expressive) Toolbar — a container of action slots.
 *
 * `docked` renders a full-width 64dp bar (SurfaceContainer / PrimaryContainer),
 * items centered 32dp apart (shrinking to 4dp when tight) inside a 16dp outside
 * padding. `floating` renders a rounded, elevated 64dp pill (CornerFull) with 8dp
 * inner padding and 4dp gaps that can flow horizontally or vertically — per
 * m3.material.io / Compose FloatingToolbarTokens. Each `IconButton` item takes a
 * 48dp slot; standard `IconButton`s pick up the scheme's content colors
 * (standard: OnSurfaceVariant, selected SecondaryContainer / OnSecondaryContainer;
 * vibrant: OnPrimaryContainer, selected SurfaceContainer / OnSurface).
 *
 * Keyboard: every item stays in the Tab order, and the arrow keys also move
 * between items — Left / Right (mirrored in RTL) for a horizontal toolbar,
 * Up / Down for a vertical one, Home / End to the ends; disabled items are
 * skipped and text fields keep their own arrow keys. Give the toolbar an
 * `aria-label` (recommended when a page has several toolbars).
 *
 * Scrolling / collapsing (docs/decisions/phase-b-api.md B25): state props
 * (`expanded` / `defaultExpanded` / `onExpandedChange`, `hidden`) plus the
 * convenience `scrollBehavior` + `scrollTarget`. The expand / collapse motion
 * uses the FastSpatial spring (Compose `expand/shrinkHorizontally`).
 */
export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(function Toolbar(
  {
    variant = 'docked',
    color = 'standard',
    orientation = 'horizontal',
    className,
    style,
    children,
    startContent,
    endContent,
    expanded: expandedProp,
    defaultExpanded = true,
    onExpandedChange,
    hidden: hiddenProp,
    scrollBehavior,
    scrollTarget,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const floating = variant === 'floating'
  const ariaOrientation = floating ? orientation : 'horizontal'
  const exitDirection = floating && orientation === 'vertical' ? 'end' : 'bottom'

  const rootRef = useRef<HTMLDivElement | null>(null)
  const startRef = useRef<HTMLDivElement | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )

  // ---- expanded (controlled / uncontrolled) ----
  const [expandedState, setExpandedState] = useState(defaultExpanded)
  const expanded = expandedProp ?? expandedState
  const setExpanded = (next: boolean) => {
    if (next === expanded) return
    if (expandedProp === undefined) setExpandedState(next)
    onExpandedChange?.(next)
  }

  // ---- exitAlways ----
  const [offsetState, setOffsetState] = useState(0)
  const [scrollHidden, setScrollHidden] = useState(false)
  const [settling, setSettling] = useState(false)
  const [hiddenDistance, setHiddenDistance] = useState(0)
  const offsetRef = useRef(0)
  const collapseDistanceRef = useRef(0)

  // Distance from the toolbar's resting position to the edge of the scroll
  // viewport it exits through (Compose: to the parent's bottom / end edge).
  const measureExitDistance = () => {
    const el = rootRef.current
    if (!el) return 0
    const source = resolveScrollTarget(scrollTarget)
    const rect = el.getBoundingClientRect()
    const box =
      source && !('scrollY' in source)
        ? source.getBoundingClientRect()
        : { bottom: window.innerHeight, left: 0, right: window.innerWidth }
    if (exitDirection === 'bottom') return Math.max(0, box.bottom - (rect.top - offsetRef.current))
    const rtl = getComputedStyle(el).direction === 'rtl'
    return rtl
      ? Math.max(0, rect.right + offsetRef.current - box.left)
      : Math.max(0, box.right - (rect.left - offsetRef.current))
  }

  const applyOffset = (next: number, limit: number, settle: boolean) => {
    offsetRef.current = next
    setSettling(settle)
    setOffsetState(next)
    setScrollHidden(limit > 0 && next >= limit)
  }

  useScrollObserver(
    scrollTarget,
    scrollBehavior != null,
    ({ top, delta }) => {
      if (scrollBehavior === 'exitAlways') {
        const limit = measureExitDistance()
        // A bar holding keyboard focus stays put (internal/barFocus.ts).
        const next =
          top <= 0 || holdsKeyboardFocus(rootRef.current)
            ? 0
            : Math.min(limit, Math.max(0, offsetRef.current + delta))
        if (next !== offsetRef.current) applyOffset(next, limit, false)
      } else if (scrollBehavior === 'collapse' && floating) {
        if (top <= 0) {
          collapseDistanceRef.current = 0
          setExpanded(true)
          return
        }
        // Accumulate distance in one direction; reset when it reverses.
        const acc = collapseDistanceRef.current
        const next = Math.sign(delta) === Math.sign(acc) ? acc + delta : delta
        collapseDistanceRef.current = next
        if (expanded && next >= COLLAPSE_THRESHOLD) {
          collapseDistanceRef.current = 0
          setExpanded(false)
        } else if (!expanded && next <= -COLLAPSE_THRESHOLD) {
          collapseDistanceRef.current = 0
          setExpanded(true)
        }
      }
    },
    () => {
      // Settle a half-hidden toolbar (Compose settleFloatingToolbar: 0.5).
      if (scrollBehavior !== 'exitAlways') return
      const limit = measureExitDistance()
      const offset = offsetRef.current
      if (offset <= 0 || offset >= limit) return
      applyOffset(offset < limit / 2 ? 0 : limit, limit, true)
    },
  )

  // The `hidden` state prop needs the exit distance as well.
  useLayoutEffect(() => {
    if (hiddenProp) setHiddenDistance(measureExitDistance())
  }, [hiddenProp, exitDirection])

  const exiting = hiddenProp != null || scrollBehavior === 'exitAlways'
  const hideOffset =
    hiddenProp != null ? (hiddenProp ? hiddenDistance : 0) : scrollBehavior === 'exitAlways' ? offsetState : 0
  const fullyHidden = hiddenProp ?? (scrollBehavior === 'exitAlways' && scrollHidden)
  const rtlSign =
    exitDirection === 'end' && rootRef.current && getComputedStyle(rootRef.current).direction === 'rtl'
      ? -1
      : 1

  useLayoutEffect(() => {
    // Release focus first so it never sits inside the inert bar.
    if (fullyHidden) releaseFocus(rootRef.current)
    rootRef.current?.toggleAttribute('inert', fullyHidden)
  }, [fullyHidden])

  // Collapsed content leaves the focus order / accessibility tree; if it held
  // focus, move focus to the first remaining item.
  const collapsed = floating && !expanded
  useLayoutEffect(() => {
    const slots = [startRef.current, endRef.current]
    const hadFocus = slots.some((s) => s?.contains(document.activeElement))
    for (const s of slots) s?.toggleAttribute('inert', collapsed)
    if (collapsed && hadFocus && rootRef.current) getToolbarItems(rootRef.current)[0]?.focus()
  }, [collapsed])

  const hasChildren = Children.toArray(children).length > 0

  const slot = (content: ReactNode, position: 'start' | 'end') =>
    content == null ? null : (
      <div
        ref={position === 'start' ? startRef : endRef}
        className={styles.slot}
        data-slot={position}
        data-collapsed={collapsed || undefined}
      >
        <div className={styles.slotInner}>{content}</div>
      </div>
    )

  const vars = { '--_hide-offset': `${hideOffset * rtlSign}px` } as CSSProperties

  return (
    <div
      ref={setRefs}
      {...rest}
      style={exiting ? { ...vars, ...style } : style}
      role="toolbar"
      aria-orientation={ariaOrientation}
      data-variant={variant}
      data-color={color}
      data-orientation={orientation}
      data-expanded={floating && (startContent != null || endContent != null || !hasChildren) ? String(expanded) : undefined}
      data-empty={(floating && !hasChildren) || undefined}
      data-scroll-behavior={scrollBehavior}
      data-exit-direction={exiting ? exitDirection : undefined}
      data-hidden={hiddenProp == null ? undefined : String(hiddenProp)}
      data-settling={settling || undefined}
      className={clsx(styles.toolbar, className)}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        handleToolbarKeyDown(event, ariaOrientation)
      }}
    >
      {floating ? (
        <>
          {slot(startContent, 'start')}
          {children}
          {slot(endContent, 'end')}
        </>
      ) : (
        <>
          {startContent}
          {children}
          {endContent}
        </>
      )}
    </div>
  )
})
