import { useEffect, useRef, type ForwardedRef, type MutableRefObject, type RefObject } from 'react'

/**
 * Marker attribute for layers that must stay interactive (and announced)
 * while a modal is open — e.g. the Snackbar host, which MD3 paints above
 * dialogs. The inert walk never inerts an element carrying it.
 */
export const MODAL_EXEMPT_ATTRIBUTE = 'data-md-modal-exempt'

/** Candidates for keyboard focus; {@link getTabbable} filters what Tab reaches. */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]',
].join(', ')

function isHidden(el: HTMLElement, surface: HTMLElement): boolean {
  if (el.closest('[hidden]')) return true
  const view = el.ownerDocument.defaultView
  if (!view) return false
  if (view.getComputedStyle(el).visibility === 'hidden') return true
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    if (view.getComputedStyle(node).display === 'none') return true
    if (node === surface) break
  }
  return false
}

function radioGroupKey(el: HTMLElement): string | null {
  if (!(el instanceof HTMLInputElement) || el.type !== 'radio' || !el.name) return null
  return el.name
}

/**
 * The elements Tab can reach inside `surface`, in DOM order. Skips
 * `tabindex="-1"` (roving tab stops, the surface itself), hidden and inert
 * elements, and — like the browser — keeps one stop per radio group: the
 * checked radio, else the group's first radio.
 */
export function getTabbable(surface: HTMLElement): HTMLElement[] {
  const candidates = Array.from(surface.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) =>
      el.tabIndex >= 0 &&
      el.getAttribute('tabindex') !== '-1' &&
      el.getAttribute('aria-hidden') !== 'true' &&
      el.getAttribute('aria-disabled') !== 'true' &&
      !el.closest('[inert]') &&
      !isHidden(el, surface),
  )
  const groups = new Map<string, HTMLElement>()
  for (const el of candidates) {
    const key = radioGroupKey(el)
    if (key == null) continue
    const chosen = groups.get(key)
    if (!chosen || (!(chosen as HTMLInputElement).checked && (el as HTMLInputElement).checked)) {
      groups.set(key, el)
    }
  }
  return candidates.filter((el) => {
    const key = radioGroupKey(el)
    return key == null || groups.get(key) === el
  })
}

// --- Modal stack -----------------------------------------------------------

interface ModalEntry {
  root: HTMLElement
  surface: HTMLElement
  /** Where focus returns on close. */
  restoreFocusTo: HTMLElement | null
  /** Ancestors of `restoreFocusTo` (nearest first), for a removed trigger. */
  restoreAncestors: HTMLElement[]
  onEscape: (event: KeyboardEvent) => void
}

/** Open modals, bottom → top. Only the top entry is interactive. */
const stack: ModalEntry[] = []
/** Elements this module set `inert` on (so it only ever removes its own). */
const applied = new Set<Element>()

// Body scroll lock is counted so stacked modals only unlock when the last
// one closes.
let scrollLockCount = 0
let previousBodyOverflow = ''

const isExempt = (el: Element) => el.hasAttribute(MODAL_EXEMPT_ATTRIBUTE)

/**
 * The elements to inert for `root`: the siblings of `root` and of every
 * ancestor up to `<body>`. A sibling holding an exempt layer is not inerted
 * itself — its children are walked instead, so the exempt layer stays live.
 */
function collectInert(root: HTMLElement): Set<Element> {
  const result = new Set<Element>()
  const add = (el: Element) => {
    if (isExempt(el)) return
    // Inert set by someone else stays theirs.
    if (el.hasAttribute('inert') && !applied.has(el)) return
    if (el.querySelector(`[${MODAL_EXEMPT_ATTRIBUTE}]`)) {
      for (const child of Array.from(el.children)) add(child)
      return
    }
    result.add(el)
  }
  let node: HTMLElement = root
  while (node.parentElement && node !== document.body) {
    for (const sibling of Array.from(node.parentElement.children)) {
      if (sibling !== node) add(sibling)
    }
    node = node.parentElement
  }
  return result
}

/** Re-derive the page's inert state from the top of the stack. */
function syncInert() {
  const top = stack[stack.length - 1]
  const desired = top && top.root.isConnected ? collectInert(top.root) : new Set<Element>()
  for (const el of Array.from(applied)) {
    if (!desired.has(el)) {
      el.removeAttribute('inert')
      applied.delete(el)
    }
  }
  for (const el of desired) {
    if (!applied.has(el)) {
      el.setAttribute('inert', '')
      applied.add(el)
    }
  }
}

const precedes = (a: Node, b: Node) =>
  (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0

// Inert already keeps focus out of the background; the explicit wrap covers
// the APG requirement and focus re-entry from browser chrome. The decision
// uses document order rather than identity with the first/last stop, so a
// focused element outside the Tab sequence (a roving item, a radio) still
// wraps instead of letting focus escape.
function onDocumentKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Tab') return
  const top = stack[stack.length - 1]
  if (!top) return
  const { surface } = top
  const tabbable = getTabbable(surface)
  if (tabbable.length === 0) {
    event.preventDefault()
    surface.focus()
    return
  }
  const first = tabbable[0]
  const last = tabbable[tabbable.length - 1]
  const current = document.activeElement
  if (!(current instanceof Node) || !surface.contains(current)) {
    event.preventDefault()
    ;(event.shiftKey ? last : first).focus()
    return
  }
  if (event.shiftKey) {
    if (current === surface || !tabbable.some((el) => el !== current && precedes(el, current))) {
      event.preventDefault()
      last.focus()
    }
  } else if (current === surface ? false : !tabbable.some((el) => el !== current && precedes(current, el))) {
    event.preventDefault()
    first.focus()
  }
}

// Escape listens on `window` (bubble) so it runs after every React handler
// and `document` listener: popups nested in the modal (Menu, Tooltip,
// SearchBar…) consume the key with preventDefault / stopPropagation first.
function onWindowKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || event.defaultPrevented) return
  stack[stack.length - 1]?.onEscape(event)
}

function attachListeners() {
  document.addEventListener('keydown', onDocumentKeyDown, true)
  window.addEventListener('keydown', onWindowKeyDown)
}

function detachListeners() {
  document.removeEventListener('keydown', onDocumentKeyDown, true)
  window.removeEventListener('keydown', onWindowKeyDown)
}

function canFocus(el: HTMLElement | null): el is HTMLElement {
  return el != null && el.isConnected && !el.closest('[inert]')
}

/** Return focus for a closed top entry, with fallbacks for a removed trigger. */
function restoreFocus(entry: ModalEntry) {
  if (canFocus(entry.restoreFocusTo)) {
    entry.restoreFocusTo.focus()
    return
  }
  // The trigger is gone: move to the first tabbable element of its nearest
  // surviving ancestor (or that ancestor itself when it is focusable).
  for (const ancestor of entry.restoreAncestors) {
    if (ancestor === document.body) break
    if (!canFocus(ancestor)) continue
    // Never back into the (still mounted) overlay that just closed.
    const inside = getTabbable(ancestor).find((el) => !entry.root.contains(el))
    const target = inside ?? (ancestor.tabIndex >= 0 ? ancestor : null)
    if (target) {
      target.focus()
      return
    }
  }
  // Nothing sensible survived: the next modal down, else drop focus to the
  // body rather than leave it inside the hidden surface.
  const below = stack[stack.length - 1]
  if (below) {
    ;(getTabbable(below.surface)[0] ?? below.surface).focus()
    return
  }
  const active = document.activeElement
  if (active instanceof HTMLElement && entry.root.contains(active)) active.blur()
}

function push(entry: ModalEntry) {
  if (stack.length === 0) attachListeners()
  stack.push(entry)
  syncInert()
}

function remove(entry: ModalEntry) {
  const index = stack.indexOf(entry)
  if (index === -1) return
  const wasTop = index === stack.length - 1
  stack.splice(index, 1)
  // Closed out of order: modals opened from inside this one return focus to
  // where this one would have.
  if (!wasTop) {
    for (const above of stack.slice(index)) {
      const target = above.restoreFocusTo
      if (target && (entry.root.contains(target) || !target.isConnected)) {
        above.restoreFocusTo = entry.restoreFocusTo
        above.restoreAncestors = entry.restoreAncestors
      }
    }
  }
  syncInert()
  if (stack.length === 0) detachListeners()
  if (wasTop) restoreFocus(entry)
}

function ancestorsOf(el: HTMLElement | null): HTMLElement[] {
  const result: HTMLElement[] = []
  for (let node = el?.parentElement ?? null; node; node = node.parentElement) result.push(node)
  return result
}

export interface UseModalOptions {
  /** Whether the modal behavior is currently in effect. */
  active: boolean
  /** The fixed overlay root (scrim + surface). Its page-level siblings become inert. */
  rootRef: RefObject<HTMLElement | null>
  /** The modal surface (the `role="dialog"` element). Focus is trapped inside it. */
  surfaceRef: RefObject<HTMLElement | null>
  /**
   * Called on Escape while this modal is the topmost one. Events already
   * `defaultPrevented` (consumed by a nested popup) are ignored.
   */
  onEscape?: (event: KeyboardEvent) => void
}

/**
 * Shared APG modal-dialog behavior for overlay components (Dialog,
 * BottomSheet, modal SideSheet, modal NavigationDrawer, modal
 * NavigationRail, modal DatePicker / TimePicker):
 *
 * 1. moves focus into the surface on open (`[data-autofocus]` wins, else the
 *    first tabbable element, else the surface itself — give it tabIndex=-1),
 * 2. returns focus to the previously focused element on close (falling back
 *    to the nearest surviving ancestor's first tabbable element),
 * 3. wraps Tab / Shift+Tab inside the surface,
 * 4. makes the rest of the page `inert` while open (except
 *    `[data-md-modal-exempt]` layers),
 * 5. calls `onEscape` on Escape, and
 * 6. locks body scroll.
 *
 * Open modals form a module-level stack: only the topmost one applies inert,
 * owns the Tab wrap and reacts to Escape. When it closes, the inert state is
 * recomputed from the next one down, so modals may close in any order.
 *
 * Overlays render inline (no portal) because the design tokens live on
 * ThemeProvider's element — escaping to `document.body` would drop them.
 * Inertness is therefore applied by walking from the overlay root up to
 * `<body>` and inerting the siblings at every level; the scrim stays
 * interactive because it lives inside the overlay root.
 */
export function useModal({ active, rootRef, surfaceRef, onEscape }: UseModalOptions) {
  const onEscapeRef = useRef(onEscape)
  onEscapeRef.current = onEscape

  useEffect(() => {
    if (!active) return
    const surface = surfaceRef.current
    const root = rootRef.current
    if (!surface || !root) return

    const restoreFocusTo =
      document.activeElement instanceof HTMLElement && document.activeElement !== document.body
        ? document.activeElement
        : null

    if (scrollLockCount === 0) {
      previousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    scrollLockCount += 1

    const entry: ModalEntry = {
      root,
      surface,
      restoreFocusTo,
      restoreAncestors: ancestorsOf(restoreFocusTo),
      onEscape: (event) => onEscapeRef.current?.(event),
    }
    // Push (and re-inert) before moving focus: a closed sibling overlay's
    // root was inert under the previous top modal.
    push(entry)

    const initial =
      surface.querySelector<HTMLElement>('[data-autofocus]') ?? getTabbable(surface)[0] ?? surface
    initial.focus()

    return () => {
      scrollLockCount -= 1
      if (scrollLockCount === 0) {
        document.body.style.overflow = previousBodyOverflow
      }
      remove(entry)
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
