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
  { side, align = 'center', gap = 4, margin = 0, rtl = false }: PopupPositionOptions,
): PopupPosition {
  const resolved = resolvePopupSide(anchor, popup.height, viewport.height, side, gap, margin)
  const top = resolved === 'top' ? anchor.top - gap - popup.height : anchor.bottom + gap

  let left: number
  const alignStart = (align === 'start') !== rtl
  if (align === 'center') left = anchor.left + (anchor.width - popup.width) / 2
  else if (alignStart) left = anchor.left
  else left = anchor.right - popup.width

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
}

/**
 * Positions `popupRef` next to `anchorRef` while `open`: shows it in the top
 * layer (Popover API), measures before paint, writes `top` / `left` inline
 * (`position: fixed` coordinates), and follows scroll / resize. Returns the
 * side actually used, for `data-*` styling hooks.
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
      const isRtl = rtl ?? getComputedStyle(anchorEl).direction === 'rtl'
      const position = computePopupPosition(
        anchor,
        { width: popup.offsetWidth, height: popup.offsetHeight },
        {
          width: document.documentElement.clientWidth || window.innerWidth,
          height: document.documentElement.clientHeight || window.innerHeight,
        },
        { side, align, gap, margin, rtl: isRtl },
      )
      popup.style.top = `${position.top}px`
      popup.style.left = `${position.left}px`
      setResolvedSide(position.side)
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    const observer =
      typeof ResizeObserver === 'function' ? new ResizeObserver(() => update()) : null
    observer?.observe(popup)
    if (anchorRef.current) observer?.observe(anchorRef.current)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      observer?.disconnect()
    }
  }, [open, anchorRef, popupRef, side, align, gap, margin, rtl])

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
