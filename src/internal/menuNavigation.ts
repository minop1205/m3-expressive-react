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
      target = items[(current - 1 + items.length) % items.length]
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
