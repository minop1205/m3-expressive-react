'use client'

import { useEffect, useRef, type ForwardedRef, type MutableRefObject, type RefObject } from 'react'

/**
 * Elements that can receive keyboard focus. `[tabindex="-1"]` is excluded so
 * roving-tabindex children and the surface itself don't join the Tab cycle.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

function getFocusable(surface: HTMLElement): HTMLElement[] {
  return Array.from(surface.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.getAttribute('aria-hidden') !== 'true' && el.getAttribute('aria-disabled') !== 'true',
  )
}

// Body scroll lock is counted so stacked modals only unlock when the last
// one closes.
let scrollLockCount = 0
let previousBodyOverflow = ''

export interface UseModalOptions {
  /** Whether the modal behavior is currently in effect. */
  active: boolean
  /** The fixed overlay root (scrim + surface). Its page-level siblings become inert. */
  rootRef: RefObject<HTMLElement | null>
  /** The modal surface (the `role="dialog"` element). Focus is trapped inside it. */
  surfaceRef: RefObject<HTMLElement | null>
}

/**
 * Shared APG modal-dialog behavior for overlay components (Dialog,
 * BottomSheet, modal SideSheet, modal NavigationDrawer):
 *
 * 1. moves focus into the surface on open (`[data-autofocus]` wins, else the
 *    first focusable element, else the surface itself — give it tabIndex=-1),
 * 2. returns focus to the previously focused element on close,
 * 3. wraps Tab / Shift+Tab inside the surface,
 * 4. makes the rest of the page `inert` while open, and
 * 5. locks body scroll.
 *
 * Overlays render inline (no portal) because the design tokens live on
 * ThemeProvider's element — escaping to `document.body` would drop them.
 * Inertness is therefore applied by walking from the overlay root up to
 * `<body>` and inerting the siblings at every level; the scrim stays
 * interactive because it lives inside the overlay root.
 */
export function useModal({ active, rootRef, surfaceRef }: UseModalOptions) {
  const restoreFocusTo = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) return
    const surface = surfaceRef.current
    const root = rootRef.current
    if (!surface || !root) return

    restoreFocusTo.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const initial =
      surface.querySelector<HTMLElement>('[data-autofocus]') ?? getFocusable(surface)[0] ?? surface
    initial.focus()

    if (scrollLockCount === 0) {
      previousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    scrollLockCount += 1

    const inerted: Element[] = []
    let node: HTMLElement | null = root
    while (node && node.parentElement && node !== document.body) {
      for (const sibling of Array.from(node.parentElement.children)) {
        if (sibling !== node && !sibling.hasAttribute('inert')) {
          sibling.setAttribute('inert', '')
          inerted.push(sibling)
        }
      }
      node = node.parentElement
    }

    // Inert already keeps focus out of the background; the explicit wrap
    // covers the APG requirement and focus re-entry from browser chrome.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const focusable = getFocusable(surface)
      if (focusable.length === 0) {
        event.preventDefault()
        surface.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const current = document.activeElement
      if (event.shiftKey && (current === first || current === surface)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && current === last) {
        event.preventDefault()
        first.focus()
      } else if (!(current instanceof Node) || !surface.contains(current)) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)

    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      for (const el of inerted) el.removeAttribute('inert')
      scrollLockCount -= 1
      if (scrollLockCount === 0) {
        document.body.style.overflow = previousBodyOverflow
      }
      const restore = restoreFocusTo.current
      restoreFocusTo.current = null
      if (restore && restore.isConnected) restore.focus()
    }
    // rootRef/surfaceRef are stable ref objects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
}

/** Assign a node to both an internal ref and a forwarded ref. */
export function assignRefs<T>(
  node: T | null,
  internal: MutableRefObject<T | null>,
  forwarded: ForwardedRef<T>,
) {
  internal.current = node
  if (typeof forwarded === 'function') forwarded(node)
  else if (forwarded) forwarded.current = node
}
