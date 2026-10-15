'use client'

import { useState, type RefObject } from 'react'
import { useIsoLayoutEffect } from './useIsoLayoutEffect'

/**
 * Shared anchored-popup positioning (Phase B ruling B4).
 *
 * Mirrors the Compose popup position providers (e.g. `TooltipPositionProviderImpl`,
 * `DropdownMenuPositionProvider`): place the popup on the preferred side of the
 * anchor, **flip** to the other side when it does not fit, and **clamp** it
 * inside the viewport. The popup is drawn in the top layer via the Popover API
 * (`popover="manual"`, added by the hook) when the browser supports it, so ancestors'
 * `overflow` / `z-index` can't clip it; it keeps its DOM position, so CSS custom
 * properties (the design tokens) and the Tab order are inherited as usual.
 *
 * Internal — components expose only their own `placement` prop.
 */

/** A physical side of the anchor (the side actually used, after flipping). */
export type PopupSide = 'top' | 'bottom' | 'left' | 'right'
/** A preferred side: physical, or logical `start` / `end` (mirrored in RTL). */
export type PopupPreferredSide = PopupSide | 'start' | 'end'
export type PopupAlign = 'center' | 'start' | 'end'

export interface PopupAnchorRect {
  top: number
  bottom: number
  left: number
  right: number
  width: number
  height: number
}

export interface PopupSize {
  width: number
  height: number
}

export interface PopupPositionOptions {
  /**
   * Preferred side of the anchor. `left` / `right` (and the logical `start` /
   * `end`, which mirror in RTL) center the popup vertically on the anchor and
   * flip horizontally (Compose `TooltipAnchorPosition.Left` / `Right` /
   * `Start` / `End`).
   */
  side: PopupPreferredSide
  /**
   * Horizontal alignment to the anchor (start/end mirror in RTL), for the
   * `top` / `bottom` sides. @default 'center'
   */
  align?: PopupAlign
  /**
   * Also flip a `start` / `end` alignment when the popup would overflow the
   * viewport edge it grows toward (the deprecated Compose
   * `rememberRichTooltipPositionProvider`: start → end, else centered) — so the
   * popup takes one of the anchor's four corners. @default false
   */
  flipAlign?: boolean
  /**
   * Vertical alignment to the anchor for the `left` / `right` / `start` /
   * `end` sides: `center` (Compose tooltips) or `start` / `end` = top /
   * bottom edges aligned (a submenu beside its parent item, material-web
   * `md-sub-menu` menu corner START_START). @default 'center'
   */
  inlineAlign?: 'center' | 'start' | 'end'
  /** Gap between the anchor and the popup, px. @default 4 */
  gap?: number
  /** Minimum distance kept from the viewport edges, px. @default 0 */
  margin?: number
  /** Right-to-left layout (only affects `start` / `end` sides and alignment). @default false */
  rtl?: boolean
  /**
   * Flip + clamp into the viewport. `false` pins the popup to the anchor on
   * `side` (no flip, no clamp) — like a Compose popup with clipping disabled,
   * e.g. the docked search view that always grows down from its bar.
   * @default true
   */
  avoidCollisions?: boolean
}

export interface PopupPosition {
  top: number
  left: number
  /** The side actually used (after flipping). */
  side: PopupSide
}

/** The physical side for a preferred side (logical `start` / `end` mirror in RTL). */
export function physicalPopupSide(side: PopupPreferredSide, rtl = false): PopupSide {
  if (side === 'start') return rtl ? 'right' : 'left'
  if (side === 'end') return rtl ? 'left' : 'right'
  return side
}

/**
 * Flip rule: keep the preferred side unless the popup doesn't fit there **and**
 * the opposite side has more room (so a popup that fits nowhere stays on the
 * roomier side instead of ping-ponging).
 */
export function resolvePopupSide(
  anchor: Pick<PopupAnchorRect, 'top' | 'bottom'>,
  popupHeight: number,
  viewportHeight: number,
  side: 'top' | 'bottom',
  gap = 4,
  margin = 0,
): 'top' | 'bottom' {
  const spaceAbove = anchor.top - margin
  const spaceBelow = viewportHeight - anchor.bottom - margin
  const needed = popupHeight + gap
  if (side === 'bottom') {
    return spaceBelow < needed && spaceAbove > spaceBelow ? 'top' : 'bottom'
  }
  return spaceAbove < needed && spaceBelow > spaceAbove ? 'bottom' : 'top'
}

/** The horizontal counterpart of {@link resolvePopupSide} for `left` / `right`. */
export function resolvePopupInlineSide(
  anchor: Pick<PopupAnchorRect, 'left' | 'right'>,
  popupWidth: number,
  viewportWidth: number,
  side: 'left' | 'right',
  gap = 4,
  margin = 0,
): 'left' | 'right' {
  const spaceLeft = anchor.left - margin
  const spaceRight = viewportWidth - anchor.right - margin
  const needed = popupWidth + gap
  if (side === 'right') {
    return spaceRight < needed && spaceLeft > spaceRight ? 'left' : 'right'
  }
  return spaceLeft < needed && spaceRight > spaceLeft ? 'right' : 'left'
}

function clamp(value: number, min: number, max: number) {
  // When the popup is larger than the available range, pin it to the start.
  return max < min ? min : Math.min(Math.max(value, min), max)
}

/** Viewport coordinates (for `position: fixed`) of a popup anchored to `anchor`. */
export function computePopupPosition(
  anchor: PopupAnchorRect,
  popup: PopupSize,
  viewport: PopupSize,
  {
    side: preferredSide,
    align = 'center',
    flipAlign = false,
    inlineAlign = 'center',
    gap = 4,
    margin = 0,
    rtl = false,
    avoidCollisions = true,
  }: PopupPositionOptions,
): PopupPosition {
  const side = physicalPopupSide(preferredSide, rtl)

  if (side === 'left' || side === 'right') {
    // Beside the anchor, vertically centered (Compose left/rightPositioning)
    // or edge-aligned (`inlineAlign`).
    const resolved = avoidCollisions
      ? resolvePopupInlineSide(anchor, popup.width, viewport.width, side, gap, margin)
      : side
    const left = resolved === 'left' ? anchor.left - gap - popup.width : anchor.right + gap
    const top =
      inlineAlign === 'start'
        ? anchor.top
        : inlineAlign === 'end'
          ? anchor.bottom - popup.height
          : anchor.top + (anchor.height - popup.height) / 2
    if (!avoidCollisions) return { side: resolved, top, left }
    return {
      side: resolved,
      top: clamp(top, margin, viewport.height - popup.height - margin),
      left: clamp(left, margin, viewport.width - popup.width - margin),
    }
  }

  const resolved = avoidCollisions
    ? resolvePopupSide(anchor, popup.height, viewport.height, side, gap, margin)
    : side
  const top = resolved === 'top' ? anchor.top - gap - popup.height : anchor.bottom + gap

  let left: number
  const alignStart = (align === 'start') !== rtl
  const centered = anchor.left + (anchor.width - popup.width) / 2
  const leftAligned = anchor.left
  const rightAligned = anchor.right - popup.width
  if (align === 'center') left = centered
  else if (alignStart) left = leftAligned
  else left = rightAligned

  if (avoidCollisions && flipAlign && align !== 'center') {
    // Four-corner positioning: when the popup would run past the viewport
    // edge it grows toward, align it to the anchor's other edge instead; if
    // that collides too, center it (then clamp below).
    const fitsLeftAligned = leftAligned + popup.width <= viewport.width - margin
    const fitsRightAligned = rightAligned >= margin
    if (alignStart && !fitsLeftAligned) left = fitsRightAligned ? rightAligned : centered
    else if (!alignStart && !fitsRightAligned) left = fitsLeftAligned ? leftAligned : centered
  }

  if (!avoidCollisions) return { side: resolved, top, left }
  return {
    side: resolved,
    top: clamp(top, margin, viewport.height - popup.height - margin),
    left: clamp(left, margin, viewport.width - popup.width - margin),
  }
}

/**
 * Whether the anchor lies entirely outside the viewport (Floating UI's
 * `hide` middleware, `referenceHidden`). Edges touching the viewport and
 * degenerate zero-size rects at the origin still count as visible.
 */
export function isAnchorOutsideViewport(
  anchor: Pick<PopupAnchorRect, 'top' | 'bottom' | 'left' | 'right'>,
  viewport: PopupSize,
): boolean {
  return (
    anchor.bottom < 0 ||
    anchor.top > viewport.height ||
    anchor.right < 0 ||
    anchor.left > viewport.width
  )
}

type PopoverElement = HTMLElement & {
  showPopover?: () => void
  hidePopover?: () => void
}

/** Whether `el` is currently shown in the top layer (an open popover). */
export function isPopoverOpen(el: HTMLElement) {
  try {
    return el.matches(':popover-open')
  } catch {
    return false
  }
}

function supportsPopover(el: PopoverElement) {
  return typeof el.showPopover === 'function' && typeof el.hidePopover === 'function'
}

/**
 * Promote the popup to the top layer (no-op without Popover API support). The
 * `popover` attribute is added here, client-side and only when supported, so
 * server markup stays stable and environments that style `[popover]` without
 * implementing it (e.g. jsdom) don't hide the popup for good.
 */
export function showInTopLayer(el: PopoverElement) {
  if (!supportsPopover(el) || !el.isConnected) return
  if (!el.hasAttribute('popover')) el.setAttribute('popover', 'manual')
  if (!isPopoverOpen(el)) el.showPopover!()
}

/** Leave the top layer (no-op when not shown there). */
export function hideFromTopLayer(el: PopoverElement) {
  if (typeof el.hidePopover !== 'function' || !isPopoverOpen(el)) return
  el.hidePopover()
}

/**
 * How long a window resize must keep the anchor outside the viewport before
 * the popup is hidden, ms. A resize alone rarely moves an anchor out of view
 * for real (scrolling does, and hides at once); transient resizes do — e.g.
 * a browser briefly shrinking the viewport to measure or capture the page
 * (a Playwright full-page screenshot in Chrome passes through a 1×1
 * viewport). Hiding and re-showing on such a blip would flash the popup for
 * nothing — and, with focus inside, restart the component's opacity
 * transition (see the focus-keeping hide below).
 */
export const RESIZE_HIDE_DELAY_MS = 150

export interface UsePopupPositionOptions extends PopupPositionOptions {
  /** Whether the popup is shown (positions are only tracked while open). */
  open: boolean
  /** The element the popup is anchored to (observed for size changes and moves). */
  anchorRef?: RefObject<HTMLElement | null>
  /**
   * A virtual anchor rect (viewport coordinates) used instead of the anchor
   * element's — e.g. a point for a context menu, or a submenu's parent item
   * widened to the parent menu (#436). Keep it stable (`useCallback`): a new
   * function re-runs the positioning.
   */
  getAnchorRect?: () => PopupAnchorRect
  /** The popup (`position: fixed`; made a `popover="manual"` element for the top layer). */
  popupRef: RefObject<HTMLElement | null>
  /** Also size the popup to the anchor's width (inline `width`). @default false */
  matchAnchorWidth?: boolean
  /**
   * Also write the anchor's center relative to the popup's top-left corner as
   * `--_popup-anchor-x` / `--_popup-anchor-y` (px), e.g. to point a caret at
   * the anchor. @default false
   */
  trackAnchorCenter?: boolean
}

/**
 * Calls `onMove` when `element` moves in the viewport without being resized
 * or scrolled (a layout shift, e.g. content inserted above it) — which
 * neither ResizeObserver nor scroll / resize events report. An
 * IntersectionObserver whose root margin shrinks the viewport to exactly the
 * element's rect fires as soon as the element leaves that rect; it is then
 * re-armed at the new position (the technique of Floating UI's `autoUpdate`).
 */
function observeMove(element: Element, onMove: () => void): () => void {
  if (typeof IntersectionObserver !== 'function') return () => {}
  let observer: IntersectionObserver | null = null
  let timeout: ReturnType<typeof setTimeout> | undefined
  const root = document.documentElement

  const arm = (threshold = 1) => {
    observer?.disconnect()
    clearTimeout(timeout)
    const { left, top, width, height } = element.getBoundingClientRect()
    if (!width || !height) return
    const insetTop = Math.floor(top)
    const insetRight = Math.floor(root.clientWidth - (left + width))
    const insetBottom = Math.floor(root.clientHeight - (top + height))
    const insetLeft = Math.floor(left)
    const rootMargin = `${-insetTop}px ${-insetRight}px ${-insetBottom}px ${-insetLeft}px`
    let first = true
    const onChange = ([entry]: IntersectionObserverEntry[]) => {
      const ratio = entry.intersectionRatio
      if (ratio !== threshold) {
        // The first callback reports the initial state: re-arm at the actual
        // visible ratio when the element is partly outside the viewport.
        if (!first) onMove()
        if (!ratio) {
          // Fully outside its own rect: poll once more after the move settles.
          timeout = setTimeout(() => arm(1e-7), 1000)
        } else {
          arm(ratio)
        }
      }
      first = false
    }
    const options = { rootMargin: rootMargin, threshold: Math.max(0, Math.min(1, threshold)) || 1 }
    try {
      // `root: document` keeps the viewport of this (possibly framed) document.
      observer = new IntersectionObserver(onChange, { ...options, root: root.ownerDocument })
    } catch {
      observer = new IntersectionObserver(onChange, options)
    }
    observer.observe(element)
  }

  arm()
  return () => {
    clearTimeout(timeout)
    observer?.disconnect()
  }
}

/**
 * Positions `popupRef` next to `anchorRef` while `open`: shows it in the top
 * layer (Popover API), measures before paint, writes `top` / `left` inline
 * (`position: fixed` coordinates) plus `--_popup-available-height` (the room
 * on the side used), and follows scroll / resize, size changes
 * of the anchor or the popup (ResizeObserver) and layout shifts that move the
 * anchor (IntersectionObserver). While the anchor is entirely outside the
 * viewport the popup is hidden (`visibility: hidden`, so it also leaves the
 * accessibility tree) but stays open, returning when the anchor scrolls back;
 * when it holds focus it is only made transparent and inert to the pointer
 * (`opacity: 0`, `pointer-events: none`), so focus is not dropped to `<body>`.
 * When a viewport resize (rather than a scroll) takes the anchor out of view,
 * the popup is left as is for `RESIZE_HIDE_DELAY_MS` and only hidden if the
 * anchor is still out of view then.
 * Returns the side actually used, for `data-*` styling hooks.
 */
export function usePopupPosition({
  open,
  anchorRef,
  getAnchorRect,
  popupRef,
  side,
  align = 'center',
  flipAlign = false,
  inlineAlign = 'center',
  gap = 4,
  margin = 0,
  rtl,
  avoidCollisions = true,
  matchAnchorWidth = false,
  trackAnchorCenter = false,
}: UsePopupPositionOptions): PopupSide {
  const [resolvedSide, setResolvedSide] = useState<PopupSide>(() =>
    physicalPopupSide(side, rtl ?? false),
  )

  useIsoLayoutEffect(() => {
    const popup = popupRef.current as PopoverElement | null
    if (!open || !popup) {
      if (popup) hideFromTopLayer(popup)
      return
    }
    showInTopLayer(popup)

    // Viewport size and anchor-hidden state of the last applied update, and
    // the pending re-check of a resize that left the anchor out of view.
    let applied: { width: number; height: number; anchorHidden: boolean } | null = null
    let resizeCheck: ReturnType<typeof setTimeout> | undefined
    const cancelResizeCheck = () => {
      clearTimeout(resizeCheck)
      resizeCheck = undefined
    }

    const update = (settled = false) => {
      const anchorEl = anchorRef?.current ?? null
      if (!anchorEl && !getAnchorRect) return
      const anchor = getAnchorRect ? getAnchorRect() : anchorEl!.getBoundingClientRect()
      const viewport = {
        width: document.documentElement.clientWidth || window.innerWidth,
        height: document.documentElement.clientHeight || window.innerHeight,
      }
      const anchorHidden = isAnchorOutsideViewport(anchor, viewport)
      // A viewport resize that takes a shown popup's anchor out of view may
      // be transient (RESIZE_HIDE_DELAY_MS) — whichever listener reports it
      // (resize event, or the observers reacting to the new viewport): leave
      // the popup untouched (no hide, no re-clamp into the shrunken viewport)
      // and re-check once the viewport has had time to settle. An update in
      // a viewport where the anchor is visible again cancels the re-check.
      const resized =
        applied !== null &&
        (applied.width !== viewport.width || applied.height !== viewport.height)
      if (!settled && resized && anchorHidden && applied?.anchorHidden === false) {
        resizeCheck ??= setTimeout(() => {
          resizeCheck = undefined
          update(true)
        }, RESIZE_HIDE_DELAY_MS)
        return
      }
      cancelResizeCheck()
      applied = { ...viewport, anchorHidden }
      if (matchAnchorWidth) popup.style.width = `${anchor.width}px`
      const isRtl = rtl ?? getComputedStyle(anchorEl ?? popup).direction === 'rtl'
      const position = computePopupPosition(
        anchor,
        { width: popup.offsetWidth, height: popup.offsetHeight },
        viewport,
        { side, align, flipAlign, inlineAlign, gap, margin, rtl: isRtl, avoidCollisions },
      )
      popup.style.top = `${position.top}px`
      popup.style.left = `${position.left}px`
      if (trackAnchorCenter) {
        const x = anchor.left + anchor.width / 2 - position.left
        const y = anchor.top + anchor.height / 2 - position.top
        popup.style.setProperty('--_popup-anchor-x', `${x}px`)
        popup.style.setProperty('--_popup-anchor-y', `${y}px`)
      }
      // Room between the anchor and the viewport edge on the side used, for
      // popups that cap their height to it (CSS `var(--_popup-available-height)`).
      const available =
        position.side === 'bottom'
          ? viewport.height - anchor.bottom - gap - margin
          : position.side === 'top'
            ? anchor.top - gap - margin
            : viewport.height - 2 * margin
      popup.style.setProperty('--_popup-available-height', `${Math.max(0, Math.floor(available))}px`)
      // An anchor scrolled fully out of view would leave a clamped popup
      // floating with no visible trigger: hide it (it stays open, so it
      // reappears in place once the anchor scrolls back) rather than close
      // it, which would surprise a controlled consumer mid-scroll.
      // With focus inside, `visibility: hidden` would make the browser blur
      // the focused element (focus fixup), dropping focus to <body> — and
      // the components' close-on-focus-out handlers would then dismiss the
      // popup for good. Keep it focusable but invisible instead.
      const keepFocus = anchorHidden && popup.contains(document.activeElement)
      popup.style.visibility = anchorHidden && !keepFocus ? 'hidden' : ''
      setFocusKeepingHide(keepFocus)
      setResolvedSide(position.side)
    }

    let focusKeepingHide = false
    const setFocusKeepingHide = (hide: boolean) => {
      if (hide === focusKeepingHide) return
      focusKeepingHide = hide
      popup.style.opacity = hide ? '0' : ''
      popup.style.pointerEvents = hide ? 'none' : ''
    }

    update()
    const onChange = () => update()
    window.addEventListener('resize', onChange)
    window.addEventListener('scroll', onChange, true)
    const observer =
      typeof ResizeObserver === 'function' ? new ResizeObserver(onChange) : null
    observer?.observe(popup)
    const anchorEl = anchorRef?.current
    if (anchorEl) observer?.observe(anchorEl)
    const stopMoveObserver = anchorEl ? observeMove(anchorEl, onChange) : () => {}
    return () => {
      window.removeEventListener('resize', onChange)
      window.removeEventListener('scroll', onChange, true)
      observer?.disconnect()
      stopMoveObserver()
      cancelResizeCheck()
      // Hand visibility back to the component's CSS (e.g. its close motion).
      popup.style.visibility = ''
      setFocusKeepingHide(false)
    }
  }, [
    open,
    anchorRef,
    getAnchorRect,
    popupRef,
    side,
    align,
    flipAlign,
    inlineAlign,
    gap,
    margin,
    rtl,
    avoidCollisions,
    matchAnchorWidth,
    trackAnchorCenter,
  ])

  // Leave the top layer on unmount (a still-open popover would linger there
  // only until removal, but hiding keeps the Popover API state consistent).
  useIsoLayoutEffect(() => {
    const popup = popupRef.current as PopoverElement | null
    return () => {
      if (popup) hideFromTopLayer(popup)
    }
  }, [popupRef])

  return resolvedSide
}
