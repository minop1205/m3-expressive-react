/**
 * Shared WAI-ARIA APG menu navigation: ArrowDown / ArrowUp move focus with
 * wrap, Home / End jump to the first / last item. Used by `Menu` and
 * `FabMenu`, whose items use a roving tabindex (-1).
 *
 * Returns `true` (and prevents the default) when the key was handled.
 */
export function moveMenuFocus(
  event: { key: string; preventDefault: () => void },
  items: HTMLElement[],
): boolean {
  if (items.length === 0) return false
  const current = items.indexOf(document.activeElement as HTMLElement)
  let target: HTMLElement | undefined
  switch (event.key) {
    case 'ArrowDown':
      target = items[(current + 1) % items.length]
      break
    case 'ArrowUp':
      // No item focused (current -1): go to the last item, not the one
      // before it.
      target = items[current === -1 ? items.length - 1 : (current - 1 + items.length) % items.length]
      break
    case 'Home':
      target = items[0]
      break
    case 'End':
      target = items[items.length - 1]
      break
    default:
      return false
  }
  event.preventDefault()
  target?.focus()
  return true
}

/** How long a pause resets the typeahead buffer (APG-typical). */
export const MENU_TYPEAHEAD_RESET_MS = 500

/** Per-menu typeahead buffer (keep one in a ref). */
export interface MenuTypeahead {
  buffer: string
  at: number
}

export function createMenuTypeahead(): MenuTypeahead {
  return { buffer: '', at: 0 }
}

/**
 * Shared WAI-ARIA APG menu typeahead: a printable character moves focus to
 * the next item whose label starts with it; characters typed in quick
 * succession build a prefix matched from the focused item, and the same
 * character typed repeatedly cycles through the items starting with it.
 * Used by `Menu` and `FabMenu`.
 *
 * Returns `true` when the key was a typeahead character (focus moves only
 * when an item matches).
 */
export function handleMenuTypeahead(
  event: { key: string; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean },
  items: HTMLElement[],
  state: MenuTypeahead,
  now: number = Date.now(),
): boolean {
  const { key } = event
  if (key.length !== 1 || !/\S/.test(key) || event.ctrlKey || event.metaKey || event.altKey) {
    return false
  }
  if (now - state.at > MENU_TYPEAHEAD_RESET_MS) state.buffer = ''
  state.at = now
  const char = key.toLowerCase()
  state.buffer += char
  // "aaa" cycles through the a-items rather than looking for an "aaa" prefix.
  const repeated = Array.from(state.buffer).every((c) => c === char)
  const search = repeated ? char : state.buffer
  const current = items.indexOf(document.activeElement as HTMLElement)
  // A single character searches after the focused item; a growing prefix may
  // still match the focused item itself.
  const from = search.length === 1 ? current + 1 : Math.max(current, 0)
  for (let offset = 0; offset < items.length; offset++) {
    const item = items[(from + offset) % items.length]
    if (getTypeaheadLabel(item).startsWith(search)) {
      item.focus()
      break
    }
  }
  return true
}

/**
 * The item's label text for typeahead: its text without `aria-hidden`
 * subtrees, so decorative icons — e.g. a Material Symbols `delete` ligature
 * in front of "Remove" — never match.
 */
function getTypeaheadLabel(item: HTMLElement): string {
  let text = ''
  const walk = (node: Node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) text += child.textContent ?? ''
      else if (child instanceof Element && child.getAttribute('aria-hidden') !== 'true') walk(child)
    }
  }
  walk(item)
  return text.trim().toLowerCase()
}
