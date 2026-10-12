'use client'

import { useLayoutEffect, useState, type RefObject } from 'react'

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

export type PopupSide = 'top' | 'bottom'
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
  /** Preferred side of the anchor. */
  side: PopupSide
  /** Horizontal alignment to the anchor (start/end mirror in RTL). @default 'center' */
  align?: PopupAlign
  /** Gap between the anchor and the popup, px. @default 4 */
  gap?: number
  /** Minimum distance kept from the viewport edges, px. @default 0 */
  margin?: number
  /** Right-to-left layout (only affects `start` / `end` alignment). @default false */
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

/**
 * Flip rule: keep the preferred side unless the popup doesn't fit there **and**
 * the opposite side has more room (so a popup that fits nowhere stays on the
 * roomier side instead of ping-ponging).
 */
export function resolvePopupSide(
  anchor: Pick<PopupAnchorRect, 'top' | 'bottom'>,
  popupHeight: number,
  viewportHeight: number,
  side: PopupSide,
  gap = 4,
  margin = 0,
): PopupSide {
  const spaceAbove = anchor.top - margin
  const spaceBelow = viewportHeight - anchor.bottom - margin
  const needed = popupHeight + gap
  if (side === 'bottom') {
    return spaceBelow < needed && spaceAbove > spaceBelow ? 'top' : 'bottom'
  }
  return spaceAbove < needed && spaceBelow > spaceAbove ? 'bottom' : 'top'
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
    side,
    align = 'center',
    gap = 4,
    margin = 0,
    rtl = false,
    avoidCollisions = true,
  }: PopupPositionOptions,
): PopupPosition {
  const resolved = avoidCollisions
    ? resolvePopupSide(anchor, popup.height, viewport.height, side, gap, margin)
    : side
  const top = resolved === 'top' ? anchor.top - gap - popup.height : anchor.bottom + gap

  let left: number
  const alignStart = (align === 'start') !== rtl
  if (align === 'center') left = anchor.left + (anchor.width - popup.width) / 2
  else if (alignStart) left = anchor.left
  else left = anchor.right - popup.width

  if (!avoidCollisions) return { side: resolved, top, left }
  return {
    side: resolved,
    top: clamp(top, margin, viewport.height - popup.height - margin),
    left: clamp(left, margin, viewport.width - popup.width - margin),
  }
}

type PopoverElement = HTMLElement & {
  showPopover?: () => void
  hidePopover?: () => void
}

function isPopoverOpen(el: HTMLElement) {
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
function showInTopLayer(el: PopoverElement) {
  if (!supportsPopover(el) || !el.isConnected) return
  if (!el.hasAttribute('popover')) el.setAttribute('popover', 'manual')
  if (!isPopoverOpen(el)) el.showPopover!()
}

function hideFromTopLayer(el: PopoverElement) {
  if (typeof el.hidePopover !== 'function' || !isPopoverOpen(el)) return
  el.hidePopover()
}

export interface UsePopupPositionOptions extends PopupPositionOptions {
  /** Whether the popup is shown (positions are only tracked while open). */
  open: boolean
  /** The element the popup is anchored to. */
  anchorRef: RefObject<HTMLElement | null>
  /** The popup (`position: fixed`; made a `popover="manual"` element for the top layer). */
  popupRef: RefObject<HTMLElement | null>
  /** Also size the popup to the anchor's width (inline `width`). @default false */
  matchAnchorWidth?: boolean
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
 * anchor (IntersectionObserver). Returns the side actually used, for `data-*`
 * styling hooks.
 */
export function usePopupPosition({
  open,
  anchorRef,
  popupRef,
  side,
  align = 'center',
  gap = 4,
  margin = 0,
  rtl,
  avoidCollisions = true,
  matchAnchorWidth = false,
}: UsePopupPositionOptions): PopupSide {
  const [resolvedSide, setResolvedSide] = useState<PopupSide>(side)

  useLayoutEffect(() => {
    const popup = popupRef.current as PopoverElement | null
    if (!open || !popup) {
      if (popup) hideFromTopLayer(popup)
      return
    }
    showInTopLayer(popup)

    const update = () => {
      const anchorEl = anchorRef.current
      if (!anchorEl) return
      const anchor = anchorEl.getBoundingClientRect()
      if (matchAnchorWidth) popup.style.width = `${anchor.width}px`
      const isRtl = rtl ?? getComputedStyle(anchorEl).direction === 'rtl'
      const viewport = {
        width: document.documentElement.clientWidth || window.innerWidth,
        height: document.documentElement.clientHeight || window.innerHeight,
      }
      const position = computePopupPosition(
        anchor,
        { width: popup.offsetWidth, height: popup.offsetHeight },
        viewport,
        { side, align, gap, margin, rtl: isRtl, avoidCollisions },
      )
      popup.style.top = `${position.top}px`
      popup.style.left = `${position.left}px`
      // Room between the anchor and the viewport edge on the side used, for
      // popups that cap their height to it (CSS `var(--_popup-available-height)`).
      const available =
        position.side === 'bottom'
          ? viewport.height - anchor.bottom - gap - margin
          : anchor.top - gap - margin
      popup.style.setProperty('--_popup-available-height', `${Math.max(0, Math.floor(available))}px`)
      setResolvedSide(position.side)
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    const observer =
      typeof ResizeObserver === 'function' ? new ResizeObserver(() => update()) : null
    observer?.observe(popup)
    const anchorEl = anchorRef.current
    if (anchorEl) observer?.observe(anchorEl)
    const stopMoveObserver = anchorEl ? observeMove(anchorEl, update) : () => {}
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      observer?.disconnect()
      stopMoveObserver()
    }
  }, [open, anchorRef, popupRef, side, align, gap, margin, rtl, avoidCollisions, matchAnchorWidth])

  // Leave the top layer on unmount (a still-open popover would linger there
  // only until removal, but hiding keeps the Popover API state consistent).
  useLayoutEffect(() => {
    const popup = popupRef.current as PopoverElement | null
    return () => {
      if (popup) hideFromTopLayer(popup)
    }
  }, [popupRef])

  return resolvedSide
}
