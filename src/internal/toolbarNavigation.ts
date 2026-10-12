import type { KeyboardEvent } from 'react'

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex], [contenteditable]'

// Inputs whose own arrow / Home / End keys must keep working.
const TEXT_LIKE_INPUT = /^(?:text|search|url|tel|email|password|number|range|date|datetime-local|month|time|week|radio)$/
const ARROW_ROLES = new Set([
  'textbox',
  'searchbox',
  'combobox',
  'slider',
  'spinbutton',
  'radio',
  'listbox',
  'menu',
  'menubar',
  'tablist',
  'tree',
  'grid',
])

function keepsOwnArrowKeys(el: HTMLElement): boolean {
  if (el.isContentEditable) return true
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true
  if (el instanceof HTMLInputElement) return TEXT_LIKE_INPUT.test(el.type || 'text')
  const role = el.getAttribute('role')
  return role != null && ARROW_ROLES.has(role)
}

// Popup containers that own their keyboard interaction.
const NESTED_POPUP = '[popover], [role="menu"], [role="listbox"], [role="dialog"], [role="tooltip"]'

/**
 * Whether `el` sits inside a popup nested in the toolbar — a menu / listbox /
 * dialog / top-layer popover, or the view a combobox in the toolbar controls
 * (e.g. an open SearchBar's results). Those keep their own keys and are not
 * toolbar items.
 */
function isInNestedPopup(el: HTMLElement, toolbar: HTMLElement): boolean {
  const popup = el.closest(NESTED_POPUP)
  if (popup && popup !== toolbar && toolbar.contains(popup)) return true
  for (const combobox of toolbar.querySelectorAll('[role="combobox"][aria-controls]')) {
    for (const id of (combobox.getAttribute('aria-controls') ?? '').split(/\s+/)) {
      const view = id ? document.getElementById(id) : null
      if (view && view.contains(el)) return true
    }
  }
  return false
}

/**
 * The toolbar's keyboard-reachable items, in DOM order: natively focusable,
 * in the Tab order, not disabled / aria-disabled, not inside an `inert`
 * subtree (e.g. collapsed content) or a nested popup.
 */
export function getToolbarItems(toolbar: HTMLElement): HTMLElement[] {
  return Array.from(toolbar.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      el.tabIndex >= 0 &&
      !(el as HTMLButtonElement).disabled &&
      el.getAttribute('aria-disabled') !== 'true' &&
      !el.closest('[inert]') &&
      el.closest('[role="toolbar"]') === toolbar &&
      !isInNestedPopup(el, toolbar),
  )
}

function isRtl(el: HTMLElement): boolean {
  const direction = getComputedStyle(el).direction
  if (direction === 'rtl') return true
  if (direction === 'ltr') {
    // jsdom does not compute `direction` from `dir`; trust an explicit dir.
    return el.closest('[dir]')?.getAttribute('dir') === 'rtl'
  }
  return false
}

/**
 * Toolbar arrow-key navigation (docs/audits/toolbar.md TL4 ruling): every
 * item stays in the Tab order (m3 "Use Tab to navigate through all other
 * actions" — no roving tabindex), and the arrow keys also move between items
 * (m3 key table "Tab or Arrows", WAI-ARIA toolbar pattern): Left / Right for a
 * horizontal toolbar (mirrored in RTL), Up / Down for a vertical one, Home /
 * End to the first / last item; wraps around. Disabled items are skipped, and
 * items that use the arrow keys themselves (text fields, sliders, radios …)
 * keep them.
 *
 * Returns `true` (and prevents the default) when the key was handled.
 */
export function handleToolbarKeyDown(
  event: KeyboardEvent<HTMLElement>,
  orientation: 'horizontal' | 'vertical',
): boolean {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return false
  const toolbar = event.currentTarget
  const target = event.target as HTMLElement
  if (keepsOwnArrowKeys(target) || isInNestedPopup(target, toolbar)) return false

  let step: number | 'first' | 'last'
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowLeft':
      if (orientation !== 'horizontal') return false
      step = (event.key === 'ArrowRight') !== isRtl(toolbar) ? 1 : -1
      break
    case 'ArrowDown':
    case 'ArrowUp':
      if (orientation !== 'vertical') return false
      step = event.key === 'ArrowDown' ? 1 : -1
      break
    case 'Home':
      step = 'first'
      break
    case 'End':
      step = 'last'
      break
    default:
      return false
  }

  const items = getToolbarItems(toolbar)
  const current = items.findIndex((el) => el === target || el.contains(target))
  // Focus is inside something that isn't an item (e.g. an open popup).
  if (current === -1) return false
  const next =
    step === 'first'
      ? 0
      : step === 'last'
        ? items.length - 1
        : (current + step + items.length) % items.length
  event.preventDefault()
  items[next]?.focus()
  return true
}
