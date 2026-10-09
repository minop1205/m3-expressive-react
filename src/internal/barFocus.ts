/**
 * Focus handling for bars that hide themselves (Toolbar `exitAlways` /
 * `hidden`, TopAppBar `enterAlways` / `hidden`) and become `inert` once
 * offscreen.
 *
 * WAI-ARIA APG / WCAG 2.4.7 & 2.4.11: keyboard focus must never be lost or
 * hidden. A bar that holds keyboard focus therefore does not scroll away
 * (`holdsKeyboardFocus`) — it resumes hiding on the next scroll after focus
 * leaves. Focus from a pointer press (which shows no focus indicator, e.g. a
 * clicked action) doesn't hold the bar; it, and any focus inside a bar hidden
 * through its `hidden` prop, is released (`releaseFocus`) before the bar goes
 * inert, so it never sits on an element in an inert subtree.
 */

/** Whether `el` contains the focused element and that focus is keyboard-visible. */
export function holdsKeyboardFocus(el: HTMLElement | null): boolean {
  const active = typeof document === 'undefined' ? null : document.activeElement
  if (!el || !active || !el.contains(active)) return false
  try {
    return active.matches(':focus-visible')
  } catch {
    // No :focus-visible support: treat any focus as keyboard focus.
    return true
  }
}

/** Moves focus out of `el` (to the document) when it holds focus. */
export function releaseFocus(el: HTMLElement | null): void {
  const active = typeof document === 'undefined' ? null : document.activeElement
  if (el && active instanceof HTMLElement && el.contains(active)) active.blur()
}
