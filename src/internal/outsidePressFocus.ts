/**
 * Focus after a popup (Menu, FabMenu) closes on an outside press (#515).
 *
 * m3 menus/accessibility: "Where focus is placed after closing the menu
 * depends on the app". Web adaptation: when the press lands on something
 * that takes focus (the target or a focusable ancestor), the browser moves
 * focus there and we leave it; otherwise focus would fall to `<body>`, so it
 * returns to the trigger — the same as the Escape path.
 */

/** Elements a mouse press focuses (the target or its nearest such ancestor). */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not(:disabled)',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  'iframe',
  'audio[controls]',
  'video[controls]',
  'summary',
  '[tabindex]',
  '[contenteditable]:not([contenteditable="false"])',
].join(', ')

/** Whether a press on `target` gives focus to it or to a focusable ancestor. */
export function pressTakesFocus(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  const el = target.closest(FOCUSABLE_SELECTOR)
  return el != null && !el.closest('[inert]')
}

/** A tap's compatibility mouse events (and their focus change) come late. */
const TOUCH_SETTLE_MS = 1000

/**
 * Call from the outside-press (`pointerdown`) handler that closes a popup.
 * If the press does not take focus and focus was within `root` (trigger +
 * popup), `restore` runs once the press's own focus handling (the
 * `mousedown` default) is done and focus has fallen to `<body>` or is still
 * left inside the closed popup.
 */
export function restoreFocusAfterOutsidePress(
  event: PointerEvent,
  root: Element | null,
  restore: () => void,
): void {
  if (!root || pressTakesFocus(event.target)) return
  if (!root.contains(document.activeElement)) return
  const check = () => {
    const active = document.activeElement
    if (!active || active === document.body || root.contains(active)) restore()
  }
  // pointerdown and mousedown of one mouse / pen press run in the same task.
  setTimeout(check, 0)
  if (event.pointerType !== 'touch') return
  // A touch tap fires its mousedown after the release: check again then.
  const done = () => {
    clearTimeout(guard)
    document.removeEventListener('click', onClick, true)
  }
  const onClick = () => {
    done()
    setTimeout(check, 0)
  }
  const guard = setTimeout(done, TOUCH_SETTLE_MS)
  document.addEventListener('click', onClick, true)
}
